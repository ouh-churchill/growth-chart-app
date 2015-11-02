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

    # Do not swallow errors in after_commit/after_rollback callbacks.
    config.active_record.raise_in_transactional_callbacks = true

    # Swap Rails::Rack::Logger with Igneous::Smart::Logger to inject additional information
    # in the log. The actual implementation will not be altered as super will be called to execute the logic in
    # Rails::Rack::Logger after the additional logging information is injected.
    config.middleware.swap Rails::Rack::Logger, Igneous::Smart::Logger

    config.action_dispatch.default_headers.merge!('Strict-Transport-Security' => 'max-age=631152000')

    # Disable profiler for tests
    config.disable_profiler = true if Rails.env.test?
  end
end
