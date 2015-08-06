describe Igneous::Smart::AppsController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to apps#index' do
    expect(get('foo/apps')).to \
      route_to(controller: 'igneous/smart/apps',
               action: 'index',
               ehr_source_id: 'foo')
  end

  it 'routes to apps#show' do
    expect(get('foo/apps/1?PAT_PersonId=1.00&VIS_EncntrId=2')).to \
      route_to(controller: 'igneous/smart/apps',
               action: 'show',
               ehr_source_id: 'foo',
               id: '1',
               PAT_PersonId: '1.00',
               VIS_EncntrId: '2')
  end

  it 'routes to apps#create' do
    expect(post('apps?name=cardiac&launch_url=https://fhir.example.com&fhir_server=cerner&authorized=true')).to \
      route_to(controller: 'igneous/smart/apps',
               action: 'create',
               name: 'cardiac',
               launch_url: 'https://fhir.example.com',
               fhir_server: 'cerner',
               authorized: 'true')
  end
end
