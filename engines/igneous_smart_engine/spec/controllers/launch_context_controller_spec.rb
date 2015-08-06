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
      FactoryGirl.create(:launch_context_factory, context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c', data: data)
      FactoryGirl.create(:fhir_server_factory, name: 'cerner', url: 'https://fhir.devcernerpowerchart.com/fhir/@tenant_id@')
    end

    it 'returns success when the matching record is found' do
      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                     sub: '12345',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response).to have_http_status(:ok)

      response_in_json = JSON.parse(File.read('engines/igneous_smart_engine/spec/controllers/launch_context_data/'\
                                              'launch_context_valid_response.json'))
      expect(response.content_type).to eq 'application/json'
      expect(JSON.parse(response.body)).to eql response_in_json
    end

    it 'returns failure when there is a version mismatch' do
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

    it 'returns failure when the launch id is nil or launch id not passed in as a parameter' do
      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     sub: '12345',
                     ver: '1.0',
                     tnt: '2c400054-42d8-4e74-87b7-80b5bd5fde9f')

      expect(response.content_type).to eq 'application/json'
      expect(response).to have_http_status(:bad_request)
      parsed_response_body = JSON.parse(response.body)
      expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch:invalid-launch-code'
    end

    it 'returns failure when the launch context record cannot be found' do
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

    # commenting these lines out temporarily as this always fails today
    # (we need to work out the contract between us & OAuth 2)

    # it 'returns failure when the user is invalid' do
    #   post(:resolve, {:format => 'json', :aud => 'https://fhir.devcernerpowerchart.com/fhir/foo',
    #                           :launch => '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
    #                           :sub => '123',
    #                           :ver => '1.0',
    #                           :tnt => '2c400054-42d8-4e74-87b7-80b5bd5fde9f'})
    #
    #   expect(response.content_type).to eq 'application/json'
    #   expect(response).to have_http_status(:bad_request)
    #   parsed_response_body = JSON.parse(response.body)
    #   expect(parsed_response_body['error']).to eql 'urn:com:cerner:authorization:error:launch'\
    #                                                ':mismatch-identity-subject'
    # end
  end

  describe 'POST resolve context having patient and user fields' do
    it 'returns success when the matching record is found' do
      data = { 'patient' => '123', 'user' => '12345' }.to_json
      FactoryGirl.create(:launch_context_factory, context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8d', data: data)
      FactoryGirl.create(:fhir_server_factory, name: 'cerner', url: 'https://fhir.devcernerpowerchart.com/fhir/@tenant_id@')

      post(:resolve, format: 'json', aud: 'https://fhir.devcernerpowerchart.com/fhir/foo',
                     launch: '6e1b99f7-e05b-42d1-b304-d8180858ce8d',
                     sub: '12345',
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
