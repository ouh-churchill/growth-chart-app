describe 'filter sensitive parameters' do
  let(:config) {Rails.application.config}

  it 'filters authentication values from logs' do
    expect(config.filter_parameters).to include(:authentication)
  end
end
