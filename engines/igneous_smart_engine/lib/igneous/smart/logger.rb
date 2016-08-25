module Igneous
  module Smart

    class Logger < Rails::Rack::Logger

      # Rails hook to catch every request call and add the correlation_id, tenant_key to the Timber context.
      # The correlation_id and tenant_key will be logged in every logging message for the entire duration
      # of the request call.
      # The correlation_id and tenant_key will be deleted from the Timber context after the request call finishes.
      def call_app(request, env)
        Timber::Diagnostics.contexts[:correlation_id] = request.uuid

        if request.path == '/smart/launch/resolve' && request.content_type == 'application/json'
          body = env['action_dispatch.request.request_parameters']
        end

        if request.params['tenant'].present?
          Timber::Diagnostics.contexts[:tenant_key] = request.params['tenant']
        elsif body && body['tnt'].present?
          Timber::Diagnostics.contexts[:tenant_key] = body['tnt']
        else
          # The path info looks like /smart/{tenant-key}/{resource}/
          %r{^/smart/(?<ehr_source_id>[\w-]+)/}.match(env['PATH_INFO']) { |match|
            Timber::Diagnostics.contexts[:tenant_key] = match[:ehr_source_id]
          }
        end

        ret = super
        Timber::Diagnostics.contexts.delete(:correlation_id)
        Timber::Diagnostics.contexts.delete(:tenant_key)

        ret
      end
    end
  end
end
