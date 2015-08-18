module Igneous
  module Smart

    class Logger < Rails::Rack::Logger

      # Rails hook to catch every request call and add the correlation_id to the Timber context.
      # The correlation_id will be logged in every logging message for the entire duration of the request call.
      # The correlation_id will be deleted from the Timber context after the request call finishes.
      def call_app(request, env)
        Timber::Diagnostics.contexts[:correlation_id] = request.uuid

        ret = super
        Timber::Diagnostics.contexts.delete(:correlation_id)

        ret
      end
    end
  end
end
