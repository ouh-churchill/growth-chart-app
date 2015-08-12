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
          context_id: LaunchContext.context(params).context_id
        }
      end

      def show
        app = App.find_by app_id: params[:id]

        if app.nil?
          audit_smart_event(:smart_launch_app, :minor_failure, app_id: params[:id], error: 'Unknown Application')
          head 404
          return
        end

        context = LaunchContext.context(params)
        launch_url = app.smart_launch_url(params, context.context_id)
        redirect_to launch_url and return unless app.authorized

        logger.info "#{self.class.name}, No base url configured for OAuth2." if OAUTH2_BASE_URL.blank?

        response.headers['SMART-Launch'] = context.context_id

        render locals: {
          launch_url: launch_url,
          oauth2_base_url: OAUTH2_BASE_URL
        }

        context_data =  JSON.parse(context.data)

        audit_hash = {
          tenant: params['ehr_source_id'],
          user_id: context_data['user'],
          patient_id: context_data['patient'],
          encounter_id: context_data['encounter'],
          app_name: context_data['app_name'],
          app_id: params['id']
        }.reject { |_k, v| v.nil? }

        audit_smart_event(:smart_launch_app, :success, audit_hash)
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
