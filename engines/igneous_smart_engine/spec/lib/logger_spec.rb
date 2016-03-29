require 'rails'
require 'igneous/smart/logger'

describe Igneous::Smart::Logger do

  class Rails::Rack::Logger
    def call_app(_request, _env)
    end
  end

  describe '#call_app' do
    let(:mock_app) { double(Object) }
    let(:env) { {'REQUEST_METHOD' => 'GET'} }

    before(:each) do
      @logger = Igneous::Smart::Logger.new(mock_app)
    end

    it 'adds correlation_id and tenant_key to timber' do
      returned_context = HashWithIndifferentAccess.new

      # Stub Timber::Diagnostics.context to return back the context
      # to use for validating that the correlation_id and tenant_key is stored correctly.
      expect(Timber::Diagnostics).to receive(:contexts).at_least(1).and_return(returned_context)

      request_mock = ActionDispatch::Request.new(env)
      expect(request_mock).to receive(:params).at_least(1).and_return({})
      env['PATH_INFO'] = '/smart/closed-ehr-source-id/Resource/'

      expect(returned_context).to receive(:[]=).with(:correlation_id, request_mock.uuid)
      expect(returned_context).to receive(:[]=).with(:tenant_key, 'closed-ehr-source-id')
      expect(returned_context).to receive(:delete).with(:correlation_id)
      expect(returned_context).to receive(:delete).with(:tenant_key)

      @logger.call_app(request_mock, env)
    end

    it 'tenant param added to timber' do
      returned_context = HashWithIndifferentAccess.new

      # Stub Timber::Diagnostics.context to return back the context
      # to use for validating that the correlation_id and tenant_key is stored correctly.
      expect(Timber::Diagnostics).to receive(:contexts).at_least(1).and_return(returned_context)

      params = {'tenant' => '345'}

      request_mock = ActionDispatch::Request.new(env)
      env['PATH_INFO'] = '/smart/closed-ehr-source-id/Resource/'
      expect(request_mock).to receive(:params).at_least(1).and_return(params)

      expect(returned_context).to receive(:[]=).with(:correlation_id, request_mock.uuid)
      expect(returned_context).to receive(:[]=).with(:tenant_key, '345')
      expect(returned_context).to receive(:delete).with(:correlation_id)
      expect(returned_context).to receive(:delete).with(:tenant_key)

      @logger.call_app(request_mock, env)
    end

    it 'adds only correlation_id to timber' do
      returned_context = HashWithIndifferentAccess.new

      # Stub Timber::Diagnostics.context to return back the context
      # to use for validating that the correlation_id is stored correctly.
      expect(Timber::Diagnostics).to receive(:contexts).at_least(1).and_return(returned_context)

      request_mock = ActionDispatch::Request.new({})
      expect(request_mock).to receive(:params).at_least(1).and_return({})

      expect(returned_context).to receive(:[]=).with(:correlation_id, nil)
      expect(returned_context).to receive(:delete).with(:correlation_id)
      expect(returned_context).to receive(:delete).with(:tenant_key)

      @logger.call_app(request_mock, {})
    end

    it 'deletes correlation_id and tenant_key from timber' do

      request_mock = ActionDispatch::Request.new(env)
      expect(request_mock).to receive(:params).at_least(1).and_return({})
      env['PATH_INFO'] = '/smart/closed-ehr-source-id/Resource/'

      @logger.call_app(request_mock, env)

      # Validate that the correlation_id and tenant_key are deleted from the Timber context.
      expect(Timber::Diagnostics.contexts[:correlation_id]).to be_nil
      expect(Timber::Diagnostics.contexts[:tenant_key]).to be_nil
    end

    it 'deletes correlation_id  from timber' do

      request_mock = ActionDispatch::Request.new({})
      expect(request_mock).to receive(:params).at_least(1).and_return({})

      @logger.call_app(request_mock, env)

      # Validate that the correlation_id is deleted from the Timber context.
      expect(Timber::Diagnostics.contexts[:correlation_id]).to be_nil
    end
  end
end
