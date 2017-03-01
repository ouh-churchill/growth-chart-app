FactoryGirl.define do
  factory :app_factory, class: Igneous::Smart::App do
    app_id '6e1b99f7-e05b-42d1-b304-d8180858ce81'
    name 'cardiac risk'
    launch_url 'http://smart.example.com/'
    igneous_smart_fhir_server_id 1
    authorized 't'
    persona 'provider'
  end
end
