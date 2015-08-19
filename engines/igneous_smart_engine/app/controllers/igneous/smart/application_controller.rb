
module Igneous
  module Smart
    class ApplicationController < ActionController::Base
      # Prevent CSRF attacks by using the default :null_session.
      protect_from_forgery

      skip_before_filter :verify_authenticity_token, if: :json_request?

      def json_request?
        request.format.json?
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
    end
  end
end
