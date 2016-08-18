require 'igneous/smart'

module Igneous
  module Smart
    class FhirServersController < Igneous::Smart::ApplicationController

      def create
        FhirServer.create!(params.require(:fhir_server).permit(:name, :url, :secured, :public_access))
        head 204
      end

      def index
        render json: FhirServer.all
      end
    end
  end
end
