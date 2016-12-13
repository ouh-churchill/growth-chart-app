
describe Igneous::Smart::FhirServersController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  context '#create' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        post(:create, fhir_server: { name: :cerner, url: 'https://fhir.example.com/' })

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        post(:create, fhir_server: { name: :cerner, url: 'https://fhir.example.com/' })

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

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
        post(:create, fhir_server: { name: :cerner, url: 'https://fhir.example.com/',
                                     secured: 'f', public_access: 't' })

        fhir_server = Igneous::Smart::FhirServer.find_by name: 'cerner'
        expect(fhir_server.url).to eq 'https://fhir.example.com/'
        expect(fhir_server.secured).to eq false
        expect(fhir_server.public_access).to eq true
        expect(fhir_server.server_type).to eq 'provider'
        expect(response).to have_http_status(204)
      end
    end

  end

  context '#fhir_servers' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        get :index

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        get :index

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      it 'successfully returns all FhirServers' do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'

        get :index

        expect(response).to have_http_status(200)
      end
    end

  end
end
