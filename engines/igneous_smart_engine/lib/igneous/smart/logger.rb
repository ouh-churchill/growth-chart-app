module Igneous
  module Smart

    class Logger < Rails::Rack::Logger

      # Rails hook to catch every request call and add the correlation_id, tenant_key to the Timber context.
      # The correlation_id and tenant_key will be logged in every logging message for the entire duration
      # of the request call.
      # The correlation_id and tenant_key will be deleted from the Timber context after the request call finishes.
      def call_app(request, _env)
        Timber::Diagnostics.contexts[:correlation_id] = request.uuid

        Timber::Diagnostics.contexts[:tenant_key] = request.params['tenant'] unless request.params['tenant'].blank?

        ret = super
        Timber::Diagnostics.contexts.delete(:correlation_id)
        Timber::Diagnostics.contexts.delete(:tenant_key) unless request.params['tenant'].blank?

        ret
      end
    end
  end
end
