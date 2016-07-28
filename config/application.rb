require File.expand_path('../boot', __FILE__)

require 'rails/all'

# Pick the frameworks you want:
require 'active_model/railtie'
# require 'active_record/railtie'
require 'action_controller/railtie'
require 'action_mailer/railtie'
require 'action_view/railtie'
require 'sprockets/railtie'
require 'rails/test_unit/railtie'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
groups = {
  cerner: [Rails.env]
}

Bundler.require(*Rails.groups(groups))

module IgneousSmartServer
  class Application < Rails::Application
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
    # Run "rake -D time" for a list of tasks for finding time zone names. Default is UTC.
    # config.time_zone = 'Central Time (US & Canada)'

    # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
    # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}').to_s]
    # config.i18n.default_locale = :de

     # Flag to allow consumers to opt out of use of IonCommon::Middleware.
     # Excludes the use of middleware if set to true.
     # The exclusion of this middleware is required in order to maintain consistent logging of tenant keys
     # within the server.
     IonCommon.exclude_middleware = true

    # Do not swallow errors in after_commit/after_rollback callbacks.
    config.active_record.raise_in_transactional_callbacks = true

    # Add CORS support - we accept any origin, and don't allow credentials to be sent (cookies)
    # see: http://www.html5rocks.com/en/tutorials/cors/#toc-adding-cors-support-to-the-server
    config.middleware.insert_before 0, 'Rack::Cors', logger: (-> { Rails.logger }) do
      allow do
        origins '*'
        resource '*',
                 credentials: false,
                 headers: :any,
                 methods: [:get, :options, :head],
                 max_age: 0,
                 expose: ['ETag', 'Content-Location', 'Location', 'X-Request-Id']

      end

      # Define another allow block here for POST when we move the App Validator to a CDN
      # so that we can lock down the origins.
    end

    # Swap Rails::Rack::Logger with Igneous::Smart::Logger to inject additional information
    # in the log. The actual implementation will not be altered as super will be called to execute the logic in
    # Rails::Rack::Logger after the additional logging information is injected.
    config.middleware.swap Rails::Rack::Logger, Igneous::Smart::Logger

    # Insert ActionDispatch::ParamsParser after Igneous::Smart::Logger to ensure parsing of JSON appropriately
    config.middleware.insert_after ActionDispatch::ParamsParser, Igneous::Smart::Logger

    config.action_dispatch.default_headers.merge!('Strict-Transport-Security' => 'max-age=631152000')

    # Disable profiler for tests
    config.disable_profiler = true if Rails.env.test?
  end
end
