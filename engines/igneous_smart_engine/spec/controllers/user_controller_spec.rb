describe Igneous::Smart::UserController, type: :controller do
  routes { Igneous::Smart::Engine.routes }

  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../factories', __FILE__)]
    FactoryGirl.reload
  end

  describe 'GET preauth' do

    it 'returns 400 when context_id param is not set' do
      get :preauth
      expect(response).to have_http_status(:bad_request)
    end

    it 'returns 404 when context_id is not found in table' do
      get :preauth, context_id: 'b7ccc965-d83d-4635-83cb-7471cfd972b6'
      expect(response).to have_http_status(:not_found)
    end

    it 'renders view' do
      data = { patient: '123', encounter: '456', ppr: '567', user: '12345' }.to_json
      FactoryGirl.create(:launch_context_factory,
                         context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c',
                         data: data,
                         app_id: 'd193fa79-c165-4daa-a8fd-c187fba2af4d',
                         smart_launch_url: 'http://example.com/smart/launch.html')

      get :preauth, context_id: '6e1b99f7-e05b-42d1-b304-d8180858ce8c'

      expect(response).to have_http_status(:ok)
      expect(response).to render_template('preauth')
      expect(response.headers).to have_key('SMART-Launch')
    end
  end
end
