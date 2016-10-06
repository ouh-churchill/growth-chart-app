require 'securerandom'
require 'igneous/smart/launch_context'
require 'igneous/smart/app'

describe Igneous::Smart::AppsController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  context '#index' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        get :index, ehr_source_id: 'foo'

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        get :index, ehr_source_id: 'foo'

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

      it 'retrieves SMART apps and renders them' do
        get :index, ehr_source_id: 'foo'
        expect(response).to have_http_status(200)
        expect(response).to render_template(:index)
      end

      it 'retrieves SMART apps with context and renders them' do
        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2', 'vis_encntrid' => '3',
                    'usr_personid' => '4', 'usr_positioncd' => '5', 'dev_location' => '6',
                    'APP_AppName' => '7'
        expect(response).to have_http_status(200)
        expect(response).to render_template(:index)
      end

      it 'retrieves SMART apps with context and renders them even if query params are in lower case' do
        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2',
                    'vis_encntrid' => '3', 'usr_personid' => '4', 'usr_positioncd' => '5',
                    'dev_location' => '6', 'app_appname' => '7'
        expect(response).to have_http_status(200)
        expect(response).to render_template(:index)
      end
    end
  end

  context '#show' do
    describe 'when a SMART app can be found' do
      it 'redirects to the SMART app launch URL' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app2',
                           name: 'cardia9',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false)

        get :show, ehr_source_id: 'foo', id: 'app2', username: 'test_username'
        expect(response).to have_http_status(302)
        expect(response).to redirect_to('http://smart.example5.com/?fhirServiceUrl=http%3A%2F%2Ffhir.example.com&patientId=0')
      end

      it 'audits as success, create launch context and redirect to '\
          'preauthenticate the user with displaying patient banner' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac7',
                           launch_url: 'http://smart.example6.com/',
                           authorized: true)

        allow(SecureRandom).to receive(:uuid).and_return '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
          .with(:smart_launch_app, :success, tenant: 'foo', user_id: '400',
                                             patient_id: '100', encounter_id: '300', app_id: 'app1')

        get :show, ehr_source_id: 'foo', id: 'app1', 'pat_personid' => '100.00', 'pat_pprcode' => '200.00',
                   'vis_encntrid' => '300.00', 'usr_personid' => '400.00', 'need_patient_banner' => 'true',
                   'username' => 'test_username'

        expect(response).to have_http_status(302)
        expect(response).to redirect_to('http://test.host/smart/user/preauth?context_id=11309546-4ef4-4dba-8f36-53ef3834d90e&tenant=foo')

        context = Igneous::Smart::LaunchContext.find_by context_id: '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect(JSON.parse(context.data)).to include('patient' => '100', 'ppr' => '200',
                                                    'encounter' => '300', 'user' => '400')

        expect(context.app_id).to eq 'app1'
        expect(context.smart_launch_url).to eq 'http://smart.example6.com/?iss=http%3A%2F%2Ffhir.example.com&' \
          'launch=11309546-4ef4-4dba-8f36-53ef3834d90e'
        expect(context.need_patient_banner).to eq true
      end

      it 'audits as success, create launch context and redirect to '\
          'preauthenticate the user without displaying patient banner' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac7',
                           launch_url: 'http://smart.example6.com/',
                           authorized: true)

        allow(SecureRandom).to receive(:uuid).and_return '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
          .with(:smart_launch_app,
                :success,
                tenant: 'foo',
                user_id: '400',
                patient_id: '100',
                encounter_id: '300',
                app_id: 'app1')

        get :show, ehr_source_id: 'foo', id: 'app1', 'pat_personid' => '100.00', 'pat_pprcode' => '200.00',
                   'vis_encntrid' => '300.00', 'usr_personid' => '400.00', 'need_patient_banner' => 'false',
                   'username' => 'test_username'

        expect(response).to have_http_status(302)
        expect(response).to redirect_to('http://test.host/smart/user/preauth?context_id=11309546-4ef4-4dba-8f36-53ef3834d90e&tenant=foo')

        context = Igneous::Smart::LaunchContext.find_by context_id: '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect(JSON.parse(context.data)).to include('patient' => '100', 'ppr' => '200',
                                                    'encounter' => '300', 'user' => '400')

        expect(context.app_id).to eq 'app1'
        expect(context.smart_launch_url).to eq 'http://smart.example6.com/?iss=http%3A%2F%2Ffhir.example.com&' \
          'launch=11309546-4ef4-4dba-8f36-53ef3834d90e'
        expect(context.need_patient_banner).to eq false
      end

      it 'audits as success, create launch context and redirect to '\
          'preauthenticate the user without giving the need_patient_banner' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac7',
                           launch_url: 'http://smart.example6.com/',
                           authorized: true)

        allow(SecureRandom).to receive(:uuid).and_return '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
          .with(:smart_launch_app,
                :success,
                tenant: 'foo',
                user_id: '400',
                patient_id: '100',
                encounter_id: '300',
                app_id: 'app1')

        get :show, ehr_source_id: 'foo', id: 'app1', 'pat_personid' => '100.00', 'pat_pprcode' => '200.00',
                   'vis_encntrid' => '300.00', 'usr_personid' => '400.00', 'username' => 'test_username'

        expect(response).to have_http_status(302)
        expect(response).to redirect_to('http://test.host/smart/user/preauth?context_id=11309546-4ef4-4dba-8f36-53ef3834d90e&tenant=foo')

        context = Igneous::Smart::LaunchContext.find_by context_id: '11309546-4ef4-4dba-8f36-53ef3834d90e'

        expect(JSON.parse(context.data)).to include('patient' => '100', 'ppr' => '200',
                                                    'encounter' => '300', 'user' => '400')

        expect(context.app_id).to eq 'app1'
        expect(context.smart_launch_url).to eq 'http://smart.example6.com/?iss=http%3A%2F%2Ffhir.example.com&' \
          'launch=11309546-4ef4-4dba-8f36-53ef3834d90e'
        expect(context.need_patient_banner).to eq false
      end
    end

    describe 'when a SMART app cannot be found' do
      it 'audits as minor_failure and returns 404' do
        expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
          .with(:smart_launch_app, :minor_failure, app_id: '666', error: 'Unknown Application')

        get :show, ehr_source_id: 'foo', id: '666', username: 'test_username'
        expect(response).to have_http_status(404)
      end
    end

    describe 'when tenant id or username is not supplied' do
      it 'renders html page' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: '777',
                           name: 'cardia9',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false,
                           persona: 'provider')

        get :show, id: '777'
        expect(response).to have_http_status(:ok)
        expect(response).to render_template(:show)
      end
    end

    describe 'when tenant id is supplied and username is not supplied' do
      it 'renders html page' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: '777',
                           name: 'cardia9',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false,
                           persona: 'provider')

        get :show, id: '777', ehr_source_id: 'foo'
        expect(response).to have_http_status(:ok)
        expect(response).to render_template(:show)
      end
    end

    describe 'when tenant id and usernme are supplied' do
      it 'will not render html page' do
        get :show, id: '777', ehr_source_id: 'foo', username: 'test_username'
        expect(response).to_not render_template(:show)
      end
    end
  end

  context '#create' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        post(:create, ehr_source_id: 'foo',
                      app: { name: :my_app, launch_url: 'https://example.com/', igneous_smart_fhir_server_id: 1,
                             authorized: true })

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        post(:create, ehr_source_id: 'foo',
                      app: { name: :my_app, launch_url: 'https://example.com/', igneous_smart_fhir_server_id: 1,
                             authorized: true })

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

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

  describe '#lowercase_app_params' do
    it 'converts PowerChart query params to lowercase' do
      params = {
        'PAT_PersonId'   => '1',
        'PAT_PPRCode'    => '2',
        'VIS_EncntrId'   => '3',
        'USR_PersonId'   => '4',
        'USR_PositionCd' => '5',
        'DEV_Location'   => '6',
        'APP_AppName'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'id' => 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6',
        'TEST' => 'test'
      }

      expect(controller.send(:lowercase_app_params, params)).to include(
       'pat_personid'   => '1',
       'pat_pprcode'    => '2',
       'vis_encntrid'   => '3',
       'usr_personid'   => '4',
       'usr_positioncd' => '5',
       'dev_location'   => '6',
       'app_appname'    => '7',
       'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
       'id' => 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6')

      expect(controller.send(:lowercase_app_params, params)).to_not include('test' => 'test')
    end
  end

  describe '#audit_smart_launch_app_success' do
    it 'audits success and reject any nil key' do

      params = {
        'PAT_PersonId'   => '1',
        'PAT_PPRCode'    => '2',
        'VIS_EncntrId'   => '3',
        'USR_PersonId'   => '4',
        'USR_PositionCd' => '5',
        'DEV_Location'   => '6',
        'APP_AppName'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'id' => 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6',
        'test' => 'test'
      }

      context_data = {
        'user' => '400',
        'patient' => '100',
        'encounter' => '300'
      }
      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_app,
              :success,
              tenant: '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
              user_id: '400',
              patient_id: '100',
              encounter_id: '300',
              app_id: 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6')

      controller.send(:audit_smart_launch_app_success, params, context_data)
    end

    it 'audits success for all expected keys' do

      params = {
        'PAT_PersonId'   => '1',
        'PAT_PPRCode'    => '2',
        'VIS_EncntrId'   => '3',
        'USR_PersonId'   => '4',
        'USR_PositionCd' => '5',
        'DEV_Location'   => '6',
        'APP_AppName'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'id' => 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6'
      }

      context_data = {
        'user' => '400',
        'patient' => '100',
        'encounter' => '300',
        'container_name' => 'test_container_name'
      }
      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_app,
              :success,
              tenant: '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
              user_id: '400',
              patient_id: '100',
              encounter_id: '300',
              container_name: 'test_container_name',
              app_id: 'a3f7b4ef-a793-48a3-8a0b-5729b0ed57a6')

      controller.send(:audit_smart_launch_app_success, params, context_data)
    end
  end
end
