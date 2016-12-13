require 'securerandom'
require 'igneous/smart/app'

describe Igneous::Smart::AppsDetailsController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  context '#Show' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        get :show, 'id' => 'app1, app2'

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        get :show, 'id' => 'app1, app2'

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

      it 'returns the list of apps for the requested app ids and renders them' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac1',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false)

        FactoryGirl.create(:app_factory,
                           app_id: 'app2',
                           name: 'cardiac2',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false)

        get :show, 'id' => 'app1,app2'

        expect(response).to have_http_status(200)
        expect(JSON.parse(response.body).count).to eql(2)
        expect(JSON.parse(response.body)[0]['fhir_url']).to eq 'http://fhir.example.com'
      end

      it 'returns 404 when requested SMART app cannot be found' do
        get :show, 'id' => 'app3,app4'

        expect(response).to have_http_status(404)
      end
    end
  end
end
