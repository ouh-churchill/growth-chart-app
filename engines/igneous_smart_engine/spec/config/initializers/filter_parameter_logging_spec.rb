describe 'filter sensitive parameters' do 
  let(:config) {Rails.application.config}

  it 'filters authentication and identity_token values from logs' do
    expect(config.filter_parameters).to include(:authentication, :identity_token)
  end
end