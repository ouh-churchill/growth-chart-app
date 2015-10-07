describe 'Session Store Configuration' do
  it 'should disable sessions' do
    expect(Rails.application.config.session_store).to be_nil
  end
end
