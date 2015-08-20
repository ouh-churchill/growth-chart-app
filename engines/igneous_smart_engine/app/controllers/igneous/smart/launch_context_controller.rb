require 'uri'
require 'securerandom'
require 'json'

module Igneous
  module Smart
    class LaunchContextController < Igneous::Smart::ApplicationController
      # The Authorization server api version that is supported.
      AUTHZ_API_VERSION = '1.0'

      # This will retrieve the launch context from the db matching the launch id that is passed by the OAuth server
      # Once the context is found, they will be formatted the way the OAuth server expects
      def resolve
        @error_response = {}
        @response_context = {}
        context = LaunchContext.find_by context_id: params['launch']

        if validate_version || validate_launch_id(context)
          audit_smart_event(:smart_launch_context_resolve, :minor_failure, tenant: params['tnt'],
                                                                           launch_context_id: params['launch'],
                                                                           error: @error_response['error'])
          render status: 400, json: @error_response.to_json
          return
        end

        if validate_launch_context(context)
          audit_smart_event(:smart_launch_context_resolve, :minor_failure, tenant: params['tnt'],
                                                                           error: @error_response['error'])
          render status: 500, json: @error_response.to_json
          return
        end

        context_data =  JSON.parse(context.data)
        # commenting these lines out temporarily as this always fails today
        # (we need to work out the contract between us & OAuth 2)
        # if validate_user(context_data['user'])
        #   render :status => 400, json: @error_response.to_json
        #   return
        # end

        @response_context['params'] = context_data
        @response_context['claims'] = {
          encounter: context_data['encounter'],
          patient: context_data['patient'],
          ppr: context_data['ppr'],
          user: context_data['user']
        }.reject { |_k, v| v.nil? }

        @response_context['ver'] = params['ver']
        @response_context['userfhirurl'] = user_fhir_url(context.app_id, context_data['user'].to_i.to_s)

        audit_launch_context_resolve(context_data)
        render status: 200, json: @response_context.to_json
      end

      private

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

      def validate_version
        return if version_components(params['ver'].to_s).first.eql?(version_components(AUTHZ_API_VERSION.to_s).first)
        @error_response['ver'] = params['ver']
        @error_response['error']  = 'urn:com:cerner:authorization:error:launch:unsupported-version'
        @error_response['id'] = SecureRandom.uuid

        info = "version #{params['ver']} is unsupported"
        log_info(info)
      end

      def validate_url
        return if fhir_url.eql?(params['aud'].to_s)
        @error_response['ver'] = params['ver']
        @error_response['error']  = 'urn:com:cerner:authorization:error:launch:unknown-resource-server'
        @error_response['id'] = SecureRandom.uuid

        info = "server #{params['aud']} is unknown"
        log_info(info)
      end

      def validate_launch_id(context)
        return if params['launch'] && context
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:invalid-launch-code'
        @error_response['id'] = SecureRandom.uuid

        info = 'invalid launch code'
        log_info(info)
      end

      def validate_launch_context(context)
        return if context.valid?
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:unspecified-error'
        @error_response['id'] = SecureRandom.uuid

        ::Rails.logger.error "#{self.class.name}, #{context.error.messages} thrown on retrieving context"\
                                "for the launch id #{params['launch']}"
      end

      def validate_user(user_id)
        return if user_id.to_s.eql?(params['sub'])
        @error_response['ver'] = params['ver']
        @error_response['error'] = 'urn:com:cerner:authorization:error:launch:mismatch-identity-subject'
        @error_response['id'] = SecureRandom.uuid

        info =  "unknown subject #{params['sub']}"
        log_info(info)
      end

      def user_fhir_url(app_id, user_id)
        "#{fhir_url(app_id)}/Practitioner/#{user_id}"
      end

      def version_components(version)
        major, minor, patch, *other = version.split('.')
        [major, minor, patch, *other]
      end

      def fhir_url(app_id)
        logger.warn "#{self.class.name}, App id is nil or blank." \
          and return nil if app_id.blank?

        app = App.find_by app_id: app_id
        logger.warn "#{self.class.name}, App is not found for app_id: #{app_id}" \
          and return nil if app.nil?

        app.fhir_server.url.sub('@tenant_id@', params['tnt'])
      end

      def log_info(info)
        ::Rails.logger.info "#{self.class.name}, #{info} for the launch id #{params['launch']}"
      end
    end
  end
end
