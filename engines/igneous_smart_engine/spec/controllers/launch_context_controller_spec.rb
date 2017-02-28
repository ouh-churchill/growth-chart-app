require 'oauth'
require 'net/http'
require 'spec_helper'

RSpec.describe Igneous::Smart::LaunchContextController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  context '#resolve' do
    describe 'when the request is not from the Cerner internal network' do
      it 'returns 404 if the Cerner-Trusted-Traffic header is not present' do
        post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                       launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                       sub: 'test_username',
                       ver: '1.0',
                       tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')
        expect(response).to have_http_status(404)
      end

      it 'returns 404 if the traffic is from a trusted external source' do
        request.headers['Cerner-Trusted-Traffic'] = 'not-cerner'
        post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                       launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                       sub: 'test_username',
                       ver: '1.0',
                       tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

        expect(response).to have_http_status(404)
      end
    end

    describe 'when the request is from the Cerner internal network' do
      before(:each) do
        request.headers['Cerner-Trusted-Traffic'] = 'cerner'
      end

      describe 'POST resolve' do
        before(:each) do
          data = { patient: '123', encounter: '456', ppr: '567', user: '12345' }.to_json
          FactoryGirl.create(:launch_context_factory,
                             context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                             data: data,
                             app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                             smart_launch_url: 'http://example.com/smart/launch.html',
                             need_patient_banner: true,
                             username: 'test_username')

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

        it 'returns success when aud has a "/" at the end of url string' do

          audit_hash = {
            tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
            user_id: '12345',
            patient_id: '123',
            encounter_id: '456',
            launch_context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c'
          }

          expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
            .with(:smart_launch_context_resolve, :success, audit_hash)

          post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f/',
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
          expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:audit_smart_event)
            .with(:smart_launch_context_resolve, :minor_failure,
                  tenant: '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                  launch_context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                  error: 'urn:com:cerner:authorization:error:launch:mismatch-identity-subject')

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

        it 'returns success when the user is valid' do
          post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/'\
                                          '2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                         launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                         sub: 'test_username',
                         ver: '1.0',
                         tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')
          expect(response.content_type).to eq 'application/json'
          expect(response).to have_http_status(:ok)
          parsed_response_body = JSON.parse(response.body)
          expect(parsed_response_body['error']).to be_nil
        end

        it 'returns failure when the tenant is invalid' do
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
          allow(controller).to receive(:invalid_user?).and_return false

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
                             smart_launch_url: 'http://example.com/smart/launch.html',
                             need_patient_banner: false,
                             username: 'test_username')

          FactoryGirl.create(:fhir_server_factory,
                             name: 'cerner',
                             url: 'https://fhir.example.com/fhir/@tenant_id@')

          FactoryGirl.create(:app_factory,
                             app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                             name: 'cardia9',
                             launch_url: 'http://smart.example5.com/',
                             igneous_smart_fhir_server_id: 1,
                             authorized: true)

          post(:resolve, format: 'json', aud: 'https://fhir.example.com/fhir/2c400054-42d8-4e74-87b7-80b5bd5fde9f',
                         launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8d',
                         sub: 'test_username',
                         ver: '1.0',
                         tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

          expect(response).to have_http_status(:ok)
          response_in_json = JSON.parse(File.read('engines/igneous_smart_engine/spec/controllers/launch_context_data/'\
                                              'launch_context_response_with_few_params.json'))
          expect(response.content_type).to eq 'application/json'
          expect(JSON.parse(response.body)).to eql response_in_json
        end
      end
    end
  end

  describe '#fhir_url' do
    it 'returns nil when fhir_spec_url is nil' do
      expect(controller.send(:fhir_url, nil, nil)).to be nil
    end

    it 'returns substituted value when fhir_spec_url is provided with tenant' do
      expect(controller.send(:fhir_url, 'https://fhir.devcernerpowerchart.com/dstu2/@tenant_id@',
                             '5bf02e61-09fe-49c3-8ca8-05084c30ca22')).to eq('https://fhir.devcernerpowerchart.com/'\
                             'dstu2/5bf02e61-09fe-49c3-8ca8-05084c30ca22')
    end
  end

end
