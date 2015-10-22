describe Igneous::Smart::ApplicationController do

  # An anonymous controller used for the protect_from_forgery test
  controller do

    def index
      render text: 'successful'
    end
  end

  describe 'protect_from_forgery' do
    it 'is disabled if the format is json' do
      request.accept = 'application/json'
      expect_any_instance_of(Igneous::Smart::ApplicationController).to_not receive(:verify_authenticity_token)

      post :index
    end

    it 'is enabled if the format is not json' do
      expect_any_instance_of(Igneous::Smart::ApplicationController).to receive(:verify_authenticity_token)

      post :index
    end
  end

  describe 'ensure security headers' do
    it 'verify HTTP security Headers are set' do
      get :index

      expect(response.headers['X-Frame-Options']).to eq('SAMEORIGIN')
      expect(response.headers['X-XSS-Protection']).to eq('1; mode=block')
      expect(response.headers['X-Content-Type-Options']).to eq('nosniff')
      expect(response.headers['Strict-Transport-Security']).to eq('max-age=631152000')
    end
  end
end
