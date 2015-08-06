require 'securerandom'
require 'igneous/smart/launch_context'

describe Igneous::Smart::AppsController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  describe 'GET index' do
    it 'retrieves SMART apps and renders them' do
      allow(SecureRandom).to receive(:uuid).and_return '46134c2c-7412-4d53-b09e-e8ced4c73dbc'

      get :index, ehr_source_id: 'foo'
      expect(response).to have_http_status(200)
      expect(response).to render_template(:index)

      context = Igneous::Smart::LaunchContext.find_by context_id: '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      expect(context).to_not be_nil
      expect(JSON.parse(context.data)).to be_empty
    end

    it 'retrieves SMART apps with context and renders them' do
      allow(SecureRandom).to receive(:uuid).and_return '46134c2c-7412-4d53-b09e-e8ced4c73123'

      get :index, ehr_source_id: 'foo', 'PAT_PersonId' => '1', 'PAT_PPRCode' => '2', 'VIS_EncntrId' => '3',
                  'USR_PersonId' => '4', 'USR_PositionCd' => '5', 'DEV_Location' => '6',
                  'APP_AppName' => '7'
      expect(response).to have_http_status(200)
      expect(response).to render_template(:index)

      context = Igneous::Smart::LaunchContext.find_by context_id: '46134c2c-7412-4d53-b09e-e8ced4c73123'
      expect(JSON.parse(context.data)).to include('patient' => '1', 'ppr' => '2', 'encounter' => '3',
                                                  'user' => '4', 'position' => '5',
                                                  'device_location' => '6', 'app_name' => '7')
    end
  end

  describe 'GET show' do
    context 'when a SMART app can be found' do
      it 'redirects to the SMART app launch URL' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app2',
                           name: 'cardia9',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false)

        get :show, ehr_source_id: 'foo', id: 'app2'
        expect(response).to have_http_status(302)
        expect(response).to redirect_to('http://smart.example5.com/?fhirServiceUrl=http%3A%2F%2Ffhir.example.com&patientId=0')
      end

      it 'create launch context and compute launch URL' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac7',
                           launch_url: 'http://smart.example6.com/',
                           authorized: true)

        allow(SecureRandom).to receive(:uuid).and_return 'launch-context-id'

        get :show, ehr_source_id: 'foo', id: 'app1', 'PAT_PersonId' => '100.00', 'PAT_PPRCode' => '200.00',
                   'VIS_EncntrId' => '300.00', 'USR_PersonId' => '400.00'
        expect(response).to have_http_status(200)

        context = Igneous::Smart::LaunchContext.find_by context_id: 'launch-context-id'
        expect(JSON.parse(context.data)).to include('patient' => '100', 'ppr' => '200',
                                                    'encounter' => '300', 'user' => '400')
      end
    end

    context 'when a SMART app cannot be found' do
      it 'returns 404' do
        get :show, ehr_source_id: 'foo', id: '666'
        expect(response).to have_http_status(404)
      end
    end
  end

  describe '#create' do
    it 'raises ActionController::ParameterMissing if the params are invalid' do
      expect do
        post(:create, ehr_source_id: 'foo')
      end.to raise_exception(ActionController::ParameterMissing)
    end

    it 'raises an exception if create! raises an exception' do
      allow(Igneous::Smart::App).to receive(:create!) { raise 'invalid model' }

      expect do
        post(:create, ehr_source_id: 'foo', app: { foo: :bar })
      end.to raise_exception(RuntimeError, 'invalid model')
    end

    it 'successfully creates a new App with a generated app_id' do
      allow(SecureRandom).to receive(:uuid).and_return 'generated-app-id'

      post(:create, ehr_source_id: 'foo',
                    app: { name: :my_app, launch_url: 'https://example.com/', igneous_smart_fhir_server_id: 1,
                           authorized: true })

      app = Igneous::Smart::App.find_by app_id: 'generated-app-id'
      expect(app.name).to eq 'my_app'
      expect(response).to have_http_status(201)
      expect(response.headers).to have_key('Location')
    end

    it 'successfully creates a new App with the given app_id' do
      post(:create, ehr_source_id: 'foo',
                    app: { app_id: 'my-app-id', name: :my_app, launch_url: 'https://example.com/',
                           igneous_smart_fhir_server_id: 1, authorized: true })

      app = Igneous::Smart::App.find_by app_id: 'my-app-id'
      expect(app.name).to eq 'my_app'
      expect(response).to have_http_status(201)
      expect(response.headers).to have_key('Location')
    end
  end
end
