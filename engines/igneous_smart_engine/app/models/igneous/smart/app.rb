require 'securerandom'

module Igneous
  module Smart
    class App < ActiveRecord::Base
      validates_presence_of :app_id, :name, :launch_url, :igneous_smart_fhir_server_id
      validates_uniqueness_of :app_id

      belongs_to :fhir_server, foreign_key: :igneous_smart_fhir_server_id

      before_validation(on: :create) do
        self.app_id = SecureRandom.uuid if app_id.blank?
      end

      # Private: Builds and returns the launch URL of this SMART app.
      #
      # parameters - An Array of URL parameters to be included in the launch URL.
      #
      # Returns the launch URL of this SMART app.
      def build_launch_url(*parameters)
        result = launch_url
        parameters.each do |p|
          separator = result.include?('?') ? '&' : '?'
          result = "#{result}#{separator}#{p}"
        end

        result
      end

      # Private: Builds and returns the FHIR URL for the current tenant.
      #
      # params - The request parameters Hash. The ehr_source_id parameter is expected to be present.
      #
      # Example (given a FHIR url of https://fhir.example.com/@tenant_id@/open)
      #   build_fhir_url({ehr_source_id: 'd075cf8b-3261-481d-97e5-ba6c48d3b41f'})
      #   # => https%3A%2F%2Ffhir.example.com%2Fd075cf8b-3261-481d-97e5-ba6c48d3b41f%2Fopen
      #
      # Returns the FHIR URL of this SMART app based on the current tenant (URL encoded).
      def build_fhir_url(params)
        ERB::Util.url_encode(fhir_server.url.sub('@tenant_id@', params[:ehr_source_id]))
      end

      # Public: Returns the URL to launch this SMART app.
      #
      # params - The request parameters Hash.
      # context_id - The launch context uuid associated with values in the params.
      #
      # Returns the URL to launch this SMART app.
      def smart_launch_url(params, context_id)
        patient_id = params['PAT_PersonId'].to_i.to_s

        if authorized
          return build_launch_url("iss=#{build_fhir_url(params)}", "launch=#{context_id}")
        end

        build_launch_url("fhirServiceUrl=#{build_fhir_url(params)}", "patientId=#{patient_id}")
      end

      private :build_launch_url, :build_fhir_url
    end
  end
end
