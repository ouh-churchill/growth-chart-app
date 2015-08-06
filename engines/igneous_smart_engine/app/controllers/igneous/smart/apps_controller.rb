require 'yaml'
require 'igneous/smart'

module Igneous
  module Smart
    class AppsController < Igneous::Smart::ApplicationController
      OAUTH2_BASE_URL = YAML.load_file("#{Rails.root}/config/oauth.yml")[Rails.env]['oauth2_base_url']

      def index
        render locals: {
          params: params,
          apps: App.all,
          context_id: LaunchContext.context(params)
        }
      end

      def show
        app = App.find_by app_id: params[:id]

        head 404 and return if app.nil?

        context_id = LaunchContext.context(params)
        launch_url = app.smart_launch_url(params, context_id)
        redirect_to launch_url and return unless app.authorized

        logger.info "#{self.class.name}, No base url configured for OAuth2." if OAUTH2_BASE_URL.blank?

        render locals: {
          launch_url: launch_url,
          oauth2_base_url: OAUTH2_BASE_URL
        }
      end

      def create
        app = App.create!(app_params)
        head 201, location: app.app_id
      end

      private

      def app_params
        params.require(:app).permit(:app_id, :name, :launch_url, :igneous_smart_fhir_server_id, :authorized)
      end
    end
  end
end
