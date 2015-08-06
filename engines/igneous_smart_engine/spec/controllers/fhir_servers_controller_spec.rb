describe Igneous::Smart::FhirServersController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  describe '#create' do
    it 'raises ActionController::ParameterMissing if the params are invalid' do
      expect do
        post(:create)
      end.to raise_exception(ActionController::ParameterMissing)
    end

    it 'raises an exception if create! raises an exception' do
      allow(Igneous::Smart::FhirServer).to receive(:create!) { raise 'invalid model' }

      expect do
        post(:create, fhir_server: { name: :cerner, url: 'https://fhir.example.com/' })
      end.to raise_exception(RuntimeError, 'invalid model')
    end

    it 'successfully creates a new FhirServer' do
      post(:create, fhir_server: { name: :cerner, url: 'https://fhir.example.com/' })

      fhir_server = Igneous::Smart::FhirServer.find_by name: 'cerner'
      expect(fhir_server.url).to eq 'https://fhir.example.com/'
      expect(response).to have_http_status(204)
    end
  end
end
