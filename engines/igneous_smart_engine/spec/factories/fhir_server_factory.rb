FactoryGirl.define do
  factory :fhir_server_factory, class: Igneous::Smart::FhirServer do
    id 1
    name 'cerner'
    url 'http://fhir.example.com'
    secured 't'
    public_access 't'
    server_type 'provider'
  end
end
