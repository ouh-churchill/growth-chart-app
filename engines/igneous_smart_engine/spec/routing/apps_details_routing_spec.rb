describe Igneous::Smart::AppsDetailsController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to apps_details#show' do
    expect(get('apps/details/1')).to \
      route_to(controller: 'igneous/smart/apps_details',
               action: 'show',
               id: '1')
  end

end
