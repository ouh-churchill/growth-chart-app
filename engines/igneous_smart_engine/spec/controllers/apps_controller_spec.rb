require 'securerandom'
require 'igneous/smart/launch_context'
require 'igneous/smart/app'

describe Igneous::Smart::AppsController, type: :controller do
  routes { Igneous::Smart::Engine.routes }
  OAUTH2_BASE_URL = Rails.application.config_for(:oauth2)['oauth2_base_url']

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

    describe 'when json format is requested' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
        request.env['HTTP_ACCEPT'] = 'application/json'
      end

      it 'returns 401 when Authorization header is not set' do
        stub_request(:post, /authorization.example.com/)
          .to_return(status: 401, body: 'unauthorized', headers: {})

        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2',
                    'vis_encntrid' => '3', 'usr_personid' => '4', 'usr_positioncd' => '5',
                    'dev_location' => '6', 'app_appname' => '7', 'username' => 'test_user'

        expect(response).to have_http_status(:bad_request)
        expect(response.body).to include('Authorization header containing Bearer token is required.')
      end

      it 'returns 401 when response is not Net::HTTPSuccess or Net::HTTPRedirection' do
        request.headers['Authorization'] = 'Bearer abc123'

        stub_request(:post, /authorization.example.com/)
          .to_return(status: 401, body: 'unauthorized', headers: {})

        url = 'https://authorization.example.com/introspection'
        token = 'abc123'
        allow(controller).to receive(:http_connection).with(url, token).and_call_original

        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2',
                    'vis_encntrid' => '3', 'usr_personid' => '4', 'usr_positioncd' => '5',
                    'dev_location' => '6', 'app_appname' => '7', 'username' => 'test_user'

        expect(response).to have_http_status(:unauthorized)
        expect(response.body).to include('Failed to verify token')
      end

      it 'returns 401 when response is Net::HTTPSuccess but session is not active' do
        request.headers['Authorization'] = 'Bearer abc123'

        stub_request(:post, /authorization.example.com/)
          .to_return(status: 200, body: '{"active": false}', headers: {})

        url = 'https://authorization.example.com/introspection'
        token = 'abc123'
        allow(controller).to receive(:http_connection).with(url, token).and_call_original

        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2',
                    'vis_encntrid' => '3', 'usr_personid' => '4', 'usr_positioncd' => '5',
                    'dev_location' => '6', 'app_appname' => '7', 'username' => 'test_user'

        expect(response).to have_http_status(:unauthorized)
        expect(response.body).to include('Invalid or expired token')
      end

      it 'returns 200 when response is Net::HTTPSuccess and active=true' do
        request.headers['Authorization'] = 'Bearer abc123'

        stub_request(:post, /authorization.example.com/)
          .to_return(status: 200, body: '{"active": true, "iss": "https://authorization.example.com/"}', headers: {})

        url = 'https://authorization.example.com/introspection'
        token = 'abc123'
        allow(controller).to receive(:http_connection).with(url, token).and_call_original

        get :index, ehr_source_id: 'foo', 'pat_personid' => '1', 'pat_pprcode' => '2',
                    'vis_encntrid' => '3', 'usr_personid' => '4', 'usr_positioncd' => '5',
                    'dev_location' => '6', 'app_appname' => '7', 'username' => 'test_user'

        expect(response).to have_http_status(:ok)
      end

      it 'returns 200 with json response of application' do
        request.headers['Authorization'] = 'Bearer abc123'

        FactoryGirl.create(:app_factory,
                           app_id: 'app_id1',
                           name: 'application name',
                           launch_url: 'https://smart.apps.com/',
                           authorized: true)

        stub_request(:post, /authorization.example.com/)
          .to_return(status: 200, body: '{"active": true, "iss": "https://authorization.example.com/"}', headers: {})

        url = 'https://authorization.example.com/introspection'
        token = 'abc123'
        allow(controller).to receive(:http_connection).with(url, token).and_call_original

        get :index, ehr_source_id: 'tenant-id', 'pat_personid' => '100.00', 'pat_pprcode' => '200.00',
                    'vis_encntrid' => '300.00', 'usr_personid' => '400.00', 'username' => 'test_username'

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)).to include('name' => 'application name', \
                                                     'url' => 'http://test.host/smart/tenant-id/apps/app_id1')
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

    describe 'when tenant id and username are not supplied' do
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

      it 'renders plain text throwing 400 when the supplied username is more than 256 characters' do
        FactoryGirl.create(:fhir_server_factory)
        FactoryGirl.create(:app_factory,
                           app_id: '777',
                           name: 'cardia9',
                           launch_url: 'http://smart.example5.com/',
                           authorized: false,
                           persona: 'provider')

        get :show, id: '777', ehr_source_id: 'foo', username: 'ThisUserNameIsLongThisUserNameIsLong
        ThisUserNameIsLongThisUserNameIsLongThisUserNameIsLongThisUserNameIsLongThisUserNameIsLong
        ThisUserNameIsLongThisUserNameIsLongThisUserNameIsLongThisUserNameIsLongThisUserNameIsLong
        ThisUserNameIsLongThisUserNameIsLongThisUserNameIsLong'
        expect(response).to have_http_status(400)
        expect(response).to_not render_template(:show)
      end
    end
  end

  context '#render_json_or_redirect' do
    describe 'when Accept header is application/json' do
      before :each do
        request.env['HTTP_ACCEPT'] = 'application/json'
      end

      it 'will render json response' do
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
                tenant: 'tenant-id',
                user_id: '400',
                patient_id: '100',
                encounter_id: '300',
                app_id: 'app1')

        get :show, ehr_source_id: 'tenant-id', id: 'app1', 'pat_personid' => '100.00', 'pat_pprcode' => '200.00',
                   'vis_encntrid' => '300.00', 'usr_personid' => '400.00', 'username' => 'test_username'

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)).to include('smart_launch_url' => 'http://smart.example6.com/' \
                                                       '?iss=http%3A%2F%2Ffhir.example.com' \
                                                       '&launch=11309546-4ef4-4dba-8f36-53ef3834d90e',
                                                     'smart_preauth_url' => 'http://test.host/smart/user/preauth/url?tenant=tenant-id',
                                                     'oauth2_base_url' => "#{OAUTH2_BASE_URL}")
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

      it 'successfully creates two apps with same app name' do
        post(:create, ehr_source_id: 'foo',
                      app: { app_id: 'my-app-id1', name: :my_app1, launch_url: 'https://example.com/',
                             igneous_smart_fhir_server_id: 1, authorized: true })

        post(:create, ehr_source_id: 'foo',
                      app: { app_id: 'my-app-id2', name: :my_app1, launch_url: 'https://example.com/',
                             igneous_smart_fhir_server_id: 1, authorized: true })

        app1 = Igneous::Smart::App.find_by app_id: 'my-app-id1'
        app2 = Igneous::Smart::App.find_by app_id: 'my-app-id2'
        expect(app1.name).to eq 'my_app1'
        expect(app2.name).to eq 'my_app1'
      end
    end
  end

  context '#update' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        put(:update, id: 1,
                     app: { name: :my_app, launch_url: 'https://example.com/', igneous_smart_fhir_server_id: 1,
                            authorized: true })

        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        put(:update, id: 1,
                     app: { name: :my_app, launch_url: 'https://example.com/', igneous_smart_fhir_server_id: 1,
                            authorized: true })

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

      it 'successfully updates a App with the given id' do

        FactoryGirl.create(:app_factory,
                           app_id: 'app1',
                           name: 'cardiac7',
                           launch_url: 'http://smart.example6.com/',
                           igneous_smart_fhir_server_id: 4,
                           authorized: true)

        put(:update, id: 'app1',
                     app: { app_id: 'app1', name: 'my_app', launch_url: 'https://example.com/',
                            igneous_smart_fhir_server_id: 1, authorized: false, persona: 'patient' })

        app = Igneous::Smart::App.find_by app_id: 'app1'

        expect(app.name).to eq 'my_app'
        expect(app.launch_url).to eq 'https://example.com/'
        expect(app.igneous_smart_fhir_server_id).to eq 1
        expect(app.authorized).to eq false
        expect(app.persona).to eq 'patient'
        expect(response).to have_http_status(200)
      end

      describe 'when a SMART app cannot be found' do
        it 'audits as minor_failure and returns 404' do
          expect(Rails.logger).to receive(:info).at_least(:once).with(/Failed to retrieve app with app_id/)

          put(:update, id: 'app1',
                       app: { app_id: 'app1', name: 'my_app', launch_url: 'https://example.com/',
                              igneous_smart_fhir_server_id: 1, authorized: false, persona: 'patient' })
          expect(response).to have_http_status(404)
        end
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
