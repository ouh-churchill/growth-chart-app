require 'igneous/smart'

module Igneous
  module Smart
    class FhirServersController < Igneous::Smart::ApplicationController
      def create
        FhirServer.create!(params.require(:fhir_server).permit(:name, :url))
        head 204
      end
    end
  end
end
