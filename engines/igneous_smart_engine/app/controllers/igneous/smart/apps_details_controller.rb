require 'igneous/smart'

module Igneous
  module Smart
    class AppsDetailsController < Igneous::Smart::ApplicationController

      # returns the app details for the requested app Id's
      def show

        filtered_apps = App.all.select {|app| params['id'].split(',').include? app.app_id }.as_json

        if filtered_apps.empty?
          ::Rails.logger.info "#{self.class.name}, The apps with the app id's #{params['app_ids']} are not found"
          return head 404
        end

        filtered_apps.each { |app|
          fhir_server = FhirServer.find_by id: app['igneous_smart_fhir_server_id']
          if fhir_server
            app['fhir_spec'] = fhir_server.name
            app['fhir_url'] = fhir_server.url
          end
        }

        render json: filtered_apps
      end

    end
  end
end
