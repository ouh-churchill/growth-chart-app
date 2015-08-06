FactoryGirl.define do
  factory :fhir_server_factory, class: Igneous::Smart::FhirServer do
    id 1
    name 'cerner'
    url 'http://fhir.example.com'
  end
end
