describe Igneous::Smart::FhirServersController, type: :routing do
  routes { Igneous::Smart::Engine.routes }

  it 'routes to fhir_servers#create' do
    expect(post('fhir_servers')).to \
      route_to(controller: 'igneous/smart/fhir_servers', action: 'create')
  end
end
