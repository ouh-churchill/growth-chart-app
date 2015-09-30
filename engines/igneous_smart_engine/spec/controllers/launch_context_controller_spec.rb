require 'oauth'
require 'net/http'
require 'spec_helper'

RSpec.describe Igneous::Smart::LaunchContextController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  describe 'POST resolve' do
    before(:each) do
      data = { patient: '123', encounter: '456', ppr: '567', user: '12345' }.to_json
      FactoryGirl.create(:launch_context_factory,
                         context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                         data: data,
                         app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                         smart_launch_url: 'http://example.com/smart/launch.html')

      FactoryGirl.create(:fhir_server_factory,
                         name: 'cerner',
                         url: 'https://fhir.devcernerpowerchart.com/fhir/@tenant_id@')

      FactoryGirl.create(:app_factory,
                         app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                         name: 'cardia9',
                         launch_url: 'http://smart.example5.com/',
                         igneous_smart_fhir_server_id: 1,
                         authorized: true)
    end

    it 'returns success when the matching record is found and audits as success' do

      audit_hash = {
        tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
        user_id: '12345',
        patient_id: '123',
        encounter_id: '456',
        launch_context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c'
      }

      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '12345'
      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_context_resolve, :success, audit_hash)

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: 'test_username',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response).to have_http_status(:ok)

      response_in_json = JSON.parse(File.read('engines/igneous_smart_engine/spec/controllers/launch_context_data/'\
                                              'launch_context_valid_response.json'))
      expect(response.content_type).to eq 'application/json'
      expect(JSON.parse(response.body)).to eql response_in_json
    end

    it 'returns failure when there is a version mismatch and audits as minor_failure' do

      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_context_resolve, :minor_failure,
              tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
              launch_context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
              error: 'urn:com:cerner:authorization:error:launch:unsupported-version')

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: '12345',
                     ver: '2.0.0.SNAPSHOT',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch:unsupported-version'
    end

    it 'returns failure when the launch id is nil or launch id' \
       'not passed in as a parameter and audits as minor_failure' do

      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_context_resolve, :minor_failure,
              tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
              launch_context_id: nil,
              error: 'urn:com:cerner:authorization:error:launch:invalid-launch-code')

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     sub: '12345',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch:invalid-launch-code'
    end

    it 'returns failure when the launch context record cannot be found and audits as minor_failure' do

      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
        .with(:smart_launch_context_resolve, :minor_failure,
              tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
              launch_context_id: '6e1b99f7-e05b-42d1-b304-d8180858c999',
              error: 'urn:com:cerner:authorization:error:launch:invalid-launch-code')

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858c999',
                     sub: '12345',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error'\
                                                   ':launch:invalid-launch-code'
    end

    it 'returns failure when the user is invalid' do
      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '2342'

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: 'test-user',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch'\
                                                   ':mismatch-identity-subject'
    end

    it 'returns failure when resource server is unknown' do
      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '2342'

      post(:resolve, format: 'json', aud: 'https://fhir.example.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: 'test-user',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch'\
                                                   ':unknown-resource-server'
    end

    it 'returns failure when the tenant is invalid' do
      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '2342'

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde45',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: 'test_username',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde45')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch'\
                                                   ':invalid-tenant'
    end

    it 'returns failure when there is an unspecified error' do
      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '2342'

      allow_any_instance_of(Igneous::Smart::LaunchContext).to receive(:valid?).and_return false
      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: 'test-user',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:internal_server_error)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch'\
                                                   ':unspecified-error'
    end
  end

  describe 'POST resolve context having patient and user fields' do
    it 'returns success when the matching record is found' do
      data = { 'patient' => '123', 'user' => '6789' }.to_json
      FactoryGirl.create(:launch_context_factory,
                         context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8d',
                         data: data,
                         app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                         smart_launch_url: 'http://example.com/smart/launch.html')

      FactoryGirl.create(:fhir_server_factory,
                         name: 'cerner',
                         url: 'https://fhir.example.com/fhir/@tenant_id@')

      FactoryGirl.create(:app_factory,
                         app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                         name: 'cardia9',
                         launch_url: 'http://smart.example5.com/',
                         igneous_smart_fhir_server_id: 1,
                         authorized: true)

      allow(controller).to receive(:find_user_id_by_username_and_tenant).and_return '6789'
      post(:resolve, format: 'json', aud: 'https://fhir.example.com/fhir/2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8d',
                     sub: 'myusername',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response).to have_http_status(:ok)
      response_in_json = JSON.parse(File.read('engines/igneous_smart_engine/spec/controllers/launch_context_data/'\
                                              'launch_context_response_with_few_params.json'))
      expect(response.content_type).to eq 'application/json'
      expect(JSON.parse(response.body)).to eql response_in_json
    end
  end

  describe '#find_user_id_by_username' do

    before(:each) do
      @fake_response = Net::HTTPResponse.new('1.0', '200', 'Success')
      mock_consumer = double(OAuth::Consumer)
      access_token = double('access token')
      allow(mock_consumer).to receive(:get_access_token).and_return access_token
      allow(OAuth::Consumer).to receive(:new).and_return(mock_consumer)
      allow(Igneous::Smart).to receive(:cerner_care_oauth_consumer).and_return(mock_consumer)
      allow(access_token).to receive(:get).and_return @fake_response
    end

    it 'returns user id given username' do
      body = {'Resources' => [{'id': '5bf02e61-09fe-49c3-8ca8-05084c30ca23', 'externalId': '1900022',
                               'displayName': 'Test, Name', 'userName': 'username0134'}]}
      allow(@fake_response).to receive(:body).and_return(body.to_json)
      expect(controller.send(:find_user_id_by_username_and_tenant, 'username0134', nil)).to eq '1900022'
    end

    it 'returns nil when username is not found' do
      body = {'Resources': []}
      allow(@fake_response).to receive(:body).and_return(body.to_json)
      expect(controller).to receive(:log_info)
      expect(controller.send(:find_user_id_by_username_and_tenant, 'username0134', nil)).to eq nil
    end

    it 'returns nil when Resources not returned' do
      body = {}
      allow(@fake_response).to receive(:body).and_return(body.to_json)
      expect(controller.send(:find_user_id_by_username_and_tenant, 'username0134', nil)).to eq nil
    end
  end

  describe '#fhir_url' do
    it 'returns returns nil when app_id is nil' do
      expect(controller.send(:fhir_url, nil, nil)).to be nil
    end

    it 'returns returns nil when app_id is empty' do
      expect(controller.send(:fhir_url, '', nil)).to be nil
    end

    it 'returns returns nil when app_id is provided but app is not found' do
      expect(controller.send(:fhir_url, '5bf02e61-09fe-49c3-8ca8-05084c30ca22', nil)).to be nil
    end
  end

end
