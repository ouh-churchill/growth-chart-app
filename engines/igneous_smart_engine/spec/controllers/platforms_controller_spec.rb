describe Igneous::Smart::PlatformsController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  describe '#preauth' do
    it 'returns 400 when tenant is not supplied' do
      get :preauth, identityToken: 'token', appURL: 'https://app.url.com'
      expect(response).to have_http_status(:bad_request)
    end

    it 'returns 400 when identityToken is not supplied' do
      get :preauth, appURL: 'https://app.url.com'
      expect(response).to have_http_status(:bad_request)
    end

    it 'returns 400 when appURL is not supplied' do
      get :preauth, identityToken: 'token', tenant: 'tenant'
      expect(response).to have_http_status(:bad_request)
    end

    it 'renders the html page when all required params are supplied' do
      get :preauth, identityToken: 'token', appURL: 'https://app.url.com', tenant: 'tenant'
      expect(response).to have_http_status(:ok)
      expect(response).to render_template('preauth')
    end

    it 'renders the html page when all required params are supplied -- using lowercase' do
      get :preauth, identitytoken: 'token', appurl: 'https://app.url.com', tenant: 'tenant'
      expect(response).to have_http_status(:ok)
      expect(response).to render_template('preauth')
    end
  end
end
