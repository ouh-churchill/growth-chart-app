FactoryGirl.define do
  factory :launch_context_factory, class: Igneous::Smart::LaunchContext do
    context_id '6e1b99f7-e05b-42d1-b304-d8180858ce8c'
    data do
      {
        'person' => '123',
        'encounter'  => '7654',
        'ppr' => '9876'
      }
    end
    app_id '6e1b99f7-e05b-42d1-b304-d8180858ce81'
    smart_launch_url 'http://example.com/smart/launch.html'
  end
end
