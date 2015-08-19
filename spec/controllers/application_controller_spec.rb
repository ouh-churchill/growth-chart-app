describe ApplicationController do

  describe '#page_not_found' do

    it 'returns 404' do
      get(:page_not_found)

      expect(response).to have_http_status(:not_found)
    end
  end
end
