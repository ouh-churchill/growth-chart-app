describe Igneous::Smart::LaunchContextController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to launch_context#resolve' do
    expect(post('launch/resolve')).to \
      route_to(controller: 'igneous/smart/launch_context', action: 'resolve')
  end
end
