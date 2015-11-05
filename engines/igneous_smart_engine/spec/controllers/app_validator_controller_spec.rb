describe Igneous::Smart::AppValidatorController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  describe '#results' do

    it 'logs the FAILURE message when there is one or more resource failures' do

      expect(Rails.logger).to receive(:info).at_least(:once).with(/SMART App Validator FAILURE/)

      post(:results, failureCount: '1', resourceCount: '9')

      expect(response).to have_http_status(204)
    end

    it 'logs the SUCCESS message when there are no resource failures' do

      expect(Rails.logger).to receive(:info).at_least(:once).with(/SMART App Validator SUCCESS/)

      post(:results, failureCount: '0', resourceCount: '9')

      expect(response).to have_http_status(204)
    end

  end
end
