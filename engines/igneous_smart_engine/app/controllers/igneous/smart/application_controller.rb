
require 'net/http'

module Igneous
  module Smart
    class ApplicationController < ActionController::Base
      # Prevent CSRF attacks by using the default :null_session.
      protect_from_forgery

      skip_before_filter :verify_authenticity_token, if: :json_request?

      before_action :ensure_request_is_from_cerner_network

      OAUTH2_BASE_URL = Rails.application.config_for(:oauth2)['oauth2_base_url']

      def json_request?
        request.format.json?
      end

      # Returns 404 if the request is not from the internal Cerner network
      # The request header 'Cerner-Trusted-Traffic' will have value 'cerner' if the request is directed
      # from Cerner network
      def ensure_request_is_from_cerner_network
        logger.info "header 'Cerner-Trusted-Traffic' missing from request" \
          unless request.headers['Cerner-Trusted-Traffic'].present?
        head 404 unless request.headers['Cerner-Trusted-Traffic'].present? && \
                        request.headers['Cerner-Trusted-Traffic'] == 'cerner'
      end

      # Internal: Audits an event with the provided attributes.
      #
      # event_key - The event key of the event to audit (cannot be blank).
      # outcome - The outcome of the event (cannot be blank).
      # additional_audit_fields - A hash of attributes associated to the event.
      #
      # Returns nothing.
      # Raises ArgumentError if the parameter conditions are not met.
      def audit_smart_event(event_key, outcome, additional_audit_fields = {})
        raise ArgumentError, 'event_key:blank' if event_key.blank?
        raise ArgumentError, 'outcome:blank' if outcome.blank?

        Rails.application.auditor.send(event_key) do |event|
          event.send(outcome)
          event.remote_ip request.headers['X-Forwarded-For']

          additional_audit_fields.each do |audit_key, value|
            event.send(audit_key, value)
          end
        end
      end

      # Private: Make a POST connection to the url with token provided
      # url - url of the introspection endpoint
      # token - the token to pass to the server to verify
      # Return res - HTTP response object
      def http_connection(url, token)
        uri = URI(url)

        req = Net::HTTP::Post.new(uri)
        req.set_form_data(token: token)
        req['Accept'] = 'application/json'

        Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
          http.request(req)
        end
      end

      # Internal: Verify credential token and fail the request if
      # token is invalid or request failed.
      #
      # Response: 401 - unauthorized if the token is invalid or the
      # request failed
      def verify_credential_token
        introspection_url = "#{OAUTH2_BASE_URL}/introspection"

        auth_header = request.headers['Authorization']
        return render status: :bad_request, text: 'Authorization header containing Bearer token is required.' \
        unless auth_header.present?

        token = auth_header.gsub('Bearer ', '')

        res = http_connection(introspection_url, token)
        case res
        when Net::HTTPSuccess, Net::HTTPRedirection
          json_response = JSON.parse(res.body)
          render_invalid_or_expired_token \
            unless res.body.present? && json_response['active'] == true \
                                     && json_response['iss'] == "#{OAUTH2_BASE_URL}/"
        else
          logger.warn "#{self.class.name} Failed to verify token"
          render status: :unauthorized, text: 'Failed to verify token'
        end
      end

      def render_invalid_or_expired_token
        logger.warn "#{self.class.name} Invalid or expired token"
        render status: :unauthorized, text: 'Invalid or expired token'
      end

      private :http_connection, :render_invalid_or_expired_token
    end
  end
end
