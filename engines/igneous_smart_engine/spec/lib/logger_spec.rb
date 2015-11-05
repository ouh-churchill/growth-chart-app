require 'rails'
require 'igneous/smart/logger'

describe Igneous::Smart::Logger do

  class Rails::Rack::Logger
    def call_app(_request, _env)
    end
  end

  describe '#call_app' do

    before(:each) do
      @logger = Igneous::Smart::Logger.new(nil)
    end

    it 'adds correlation_id and tenant_key to timber' do
      returned_context = HashWithIndifferentAccess.new

      # Stub Timber::Diagnostics.context to return back the context
      # to use for validating that the correlation_id and tenant_key is stored correctly.
      expect(Timber::Diagnostics).to receive(:contexts).at_least(1).and_return(returned_context)

      request_mock = ActionDispatch::Request.new({})
      params = {'tenant' => '345'}

      expect(request_mock).to receive(:params).at_least(1).and_return(params)
      expect(returned_context).to receive(:[]=).with(:correlation_id, request_mock.uuid)
      expect(returned_context).to receive(:[]=).with(:tenant_key, params['tenant'])
      expect(returned_context).to receive(:delete).with(:correlation_id)
      expect(returned_context).to receive(:delete).with(:tenant_key)

      @logger.call_app(request_mock, {})
    end

    it 'adds only correlation_id to timber' do
      returned_context = HashWithIndifferentAccess.new

      # Stub Timber::Diagnostics.context to return back the context
      # to use for validating that the correlation_id is stored correctly.
      expect(Timber::Diagnostics).to receive(:contexts).at_least(1).and_return(returned_context)

      request_mock = ActionDispatch::Request.new({})
      params = {}

      expect(request_mock).to receive(:params).at_least(1).and_return(params)
      expect(returned_context).to receive(:[]=).with(:correlation_id, nil)
      expect(returned_context).to receive(:delete).with(:correlation_id)

      @logger.call_app(request_mock, {})
    end

    it 'deletes correlation_id and tenant_key from timber' do

      request_mock = ActionDispatch::Request.new({})
      params = {'tenant' => '345'}

      expect(request_mock).to receive(:params).at_least(1).and_return(params)

      @logger.call_app(request_mock, {})

      # Validate that the correlation_id and tenant_key are deleted from the Timber context.
      expect(Timber::Diagnostics.contexts[:correlation_id]).to be_nil
      expect(Timber::Diagnostics.contexts[:tenant_key]).to be_nil
    end

    it 'deletes correlation_id  from timber' do

      request_mock = ActionDispatch::Request.new({})
      params = {}
      expect(request_mock).to receive(:params).at_least(1).and_return(params)

      @logger.call_app(request_mock, {})

      # Validate that the correlation_id is deleted from the Timber context.
      expect(Timber::Diagnostics.contexts[:correlation_id]).to be_nil
    end
  end
end
