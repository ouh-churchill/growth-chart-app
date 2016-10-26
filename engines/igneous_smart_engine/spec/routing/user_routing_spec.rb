describe Igneous::Smart::UserController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to user#preauth when context_id is not supplied' do
    expect(get('user/preauth')).to \
      route_to(controller: 'igneous/smart/user',
               action: 'preauth')
  end

  it 'routes to user#preauth when context_id is supplied' do
    expect(get('user/preauth?context_id=4333b192-3a34-40e4-ac9a-f7a582ef9ffb')).to \
      route_to(controller: 'igneous/smart/user',
               action: 'preauth',
               context_id: '4333b192-3a34-40e4-ac9a-f7a582ef9ffb')
  end

  it 'routes to user#preauth_url when user/preauth/url route is requested' do
    expect(get('user/preauth/url/?tenant=tenant-id')).to \
    route_to(controller: 'igneous/smart/user',
             action: 'preauth_url',
             tenant: 'tenant-id')
  end
end
