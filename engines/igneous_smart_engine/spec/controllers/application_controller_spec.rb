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
end
