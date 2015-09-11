require 'uri'
require 'securerandom'
require 'json'
require 'yaml'
require 'igneous/smart'

module Igneous
  module Smart
    class LaunchContextController < Igneous::Smart::ApplicationController
      # The Authorization server api version that is supported.
      AUTHZ_API_VERSION = '1.0'

      USER_ROSTER_BASE_URL = YAML.load_file("#{Rails.root}/config/http.yml")[Rails.env]['user_roster']['base_url']

      # This will retrieve the launch context from the db matching the launch id that is passed by the OAuth server
      # Once the context is found, they will be formatted the way the OAuth server expects
      def resolve
        @error_response = {}
        @response_context = {}

        context = LaunchContext.find_by context_id: params['launch']
        context_data = JSON.parse(context.data) unless context.blank? || context.data.blank?
        context_data['tenant'] = params['tnt'] if context_data
        user_id = context_data['user'] unless context_data.blank?

        return if invalid_request?(context, user_id)
        context_data['username'] = params['sub'] if context_data

        @response_context['params'] = context_data.except('ppr')
        @response_context['claims'] = {
          encounter: context_data['encounter'],
          patient: context_data['patient'],
          ppr: context_data['ppr'],
          user: context_data['user']
        }.reject { |_k, v| v.nil? }

        @response_context['ver'] = params['ver']
        @response_context['userfhirurl'] = user_fhir_url(context.app_id, context_data['user'].to_i.to_s)

        audit_launch_context_resolve(context_data)
        render status: :ok, json: @response_context.to_json
      end

      private

      def invalid_request?(context, user)
        if invalid_version? || invalid_launch_id?(context) || invalid_url?(context.app_id) ||
           invalid_tenant?(context.tenant)
          audit_smart_event(:smart_launch_context_resolve, :minor_failure, tenant: params['tnt'],
                                                                           launch_context_id: params['launch'],
                                                                           error: @error_response['error'])
          render status: :bad_request, json: @error_response.to_json
          return true
        end

        if invalid_launch_context?(context)
          audit_smart_event(:smart_launch_context_resolve, :minor_failure, tenant: params['tnt'],
                                                                           error: @error_response['error'])
          render status: :internal_server_error, json: @error_response.to_json
          return true
        end

        if invalid_user?(user)
          render status: :bad_request, json: @error_response.to_json
          return true
        end

        false
      end

      def audit_launch_context_resolve(context_data)
        audit_hash = {
          tenant: params['tnt'],
          user_id: context_data['user'],
          patient_id: context_data['patient'],
          encounter_id: context_data['encounter'],
          launch_context_id: params['launch']
        }.reject { |_k, v| v.nil? }

        audit_smart_event(:smart_launch_context_resolve, :success, audit_hash)
      end

      def invalid_version?
        return false if version_components(params['ver'].to_s).first.eql?\
                       (version_components(AUTHZ_API_VERSION.to_s).first)
        @error_response['ver'] = params['ver']
        @error_response['error']  = 'urn:com:cerner:authorization:error:launch:unsupported-version'
        @error_response['id'] = SecureRandom.uuid

        info = "version #{params['ver']} is unsupported"
        log_info(info)
        true
      end

      def invalid_url?(app_id)
        return false if fhir_url(app_id).eql?(params['aud'].to_s)
        @error_response['ver'] = params['ver']
        @error_response['error']  = 'urn:com:cerner:authorization:error:launch:unknown-resource-server'
        @error_response['id'] = SecureRandom.uuid

        info = "server #{params['aud']} is unknown"
        log_info(info)
        true
      end

      def invalid_launch_id?(context)
        return false if params['launch'] && context
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:invalid-launch-code'
        @error_response['id'] = SecureRandom.uuid

        info = 'invalid launch code'
        log_info(info)
        true
      end

      def invalid_launch_context?(context)
        return false if context.valid?
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:unspecified-error'
        @error_response['id'] = SecureRandom.uuid

        logger.error "#{self.class.name}, #{context.errors.messages} thrown on retrieving context"\
                                "for the launch id #{params['launch']}"
        true
      end

      def invalid_tenant?(tenant)
        return false if tenant.to_s.eql?(params['tnt'].to_s)
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:invalid-tenant'
        @error_response['id'] = SecureRandom.uuid

        info = "tenant #{params['tnt']} is different from the tenant #{tenant} in the context"
        log_info(info)
        true
      end

      def invalid_user?(user_id)
        return false if personnel_id.eql?(user_id.to_s)
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:mismatch-identity-subject'
        @error_response['id'] = SecureRandom.uuid

        info =  "unknown subject #{params['sub']}"
        log_info(info)
        true
      end

      def user_fhir_url(app_id, user_id)
        "#{fhir_url(app_id)}/Practitioner/#{user_id}"
      end

      def version_components(version)
        major, minor, patch, *other = version.split('.')
        [major, minor, patch, *other]
      end

      def fhir_url(app_id)
        if app_id.blank?
          logger.warn "#{self.class.name}, App id is nil or blank."
          return nil
        end

        app = App.find_by app_id: app_id
        if app.nil?
          logger.warn "#{self.class.name}, App is not found for app_id: #{app_id}"
          return nil
        end

        app.fhir_server.url.sub('@tenant_id@', params['tnt'])
      end

      def personnel_id
        url = "#{USER_ROSTER_BASE_URL}/scim/v1/Realms/#{params['tnt']}/Users?filter=userName eq \"#{params['sub']}\""

        access_token = Igneous::Smart.cerner_care_oauth_consumer.get_access_token(nil)
        response = access_token.get(url, 'Accept' => 'application/json')
        json_response = JSON.parse(response.body)
        json_response['Resources'].first['externalId'] unless json_response['Resources'].blank?
      end

      def log_info(info)
        ::Rails.logger.info "#{self.class.name}, #{info} for the launch id #{params['launch']}"
      end
    end
  end
end
