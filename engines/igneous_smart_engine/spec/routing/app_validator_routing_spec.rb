describe Igneous::Smart::AppValidatorController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to app_validator#results' do
    expect(post('validator/results')).to \
      route_to(controller: 'igneous/smart/app_validator', action: 'results')
  end
end
