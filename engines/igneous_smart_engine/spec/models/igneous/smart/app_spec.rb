require 'igneous/smart/app'
require 'igneous/smart/fhir_server'

describe Igneous::Smart::App do
  before(:each) do
    FactoryGirl.definition_file_paths = [File.expand_path('../../../../factories', __FILE__)]
    FactoryGirl.reload
  end

  describe '#launch_url' do
    params = {
      'ehr_source_id' => 'foo',
      'pat_personid' => '123.00',
      'vis_encntrid' => '456.00'
    }

    it 'constructs an authorized launch url' do
      FactoryGirl.create(:fhir_server_factory)
      FactoryGirl.create(:app_factory,
                         app_id: 'unauthorized-app',
                         name: 'abc',
                         igneous_smart_fhir_server_id: 1,
                         launch_url: 'http://smart.example.com/')

      app = Igneous::Smart::App.find_by app_id: 'unauthorized-app'
      url_encoded = 'http%3A%2F%2Ffhir.example.com'

      smart_url = app.smart_launch_url(params, 'launch-context-id')
      expect(smart_url).to eq("#{app.launch_url}?iss=#{url_encoded}&launch=launch-context-id")
    end

    it 'constructs an unauthorized launch url' do
      FactoryGirl.create(:fhir_server_factory, id: 2, name: 'cerner-open', url: 'http://fhir.example.com/open')
      FactoryGirl.create(:app_factory,
                         app_id: 'auth-app',
                         name: 'abc',
                         igneous_smart_fhir_server_id: 2,
                         launch_url: 'http://smart.example1.com/',
                         authorized: 'f')

      open_app = Igneous::Smart::App.find_by app_id: 'auth-app'
      url_encoded = 'http%3A%2F%2Ffhir.example.com%2Fopen'

      smart_url = open_app.smart_launch_url(params, 'launch-context-id')
      expect(smart_url).to eq("#{open_app.launch_url}?fhirServiceUrl=#{url_encoded}&patientId=123")
    end

    # The launch URLs of some SMART apps will have static query pameters
    it 'constructs a proper launch url when the SMART url has a static query parameter' do
      FactoryGirl.create(:fhir_server_factory, id: 3, name: 'cerner-open2', url: 'http://fhir.example.com/open2')
      FactoryGirl.create(:app_factory,
                         app_id: 'app-with-static-params',
                         name: 'abc',
                         launch_url: 'http://smart.example.com/?foo=bar',
                         igneous_smart_fhir_server_id: 3,
                         authorized: 'f')

      open_app = Igneous::Smart::App.find_by app_id: 'app-with-static-params'

      url_encoded = 'http%3A%2F%2Ffhir.example.com%2Fopen2'

      expected_url = "http://smart.example.com/?foo=bar&fhirServiceUrl=#{url_encoded}&patientId=123"
      expect(open_app.smart_launch_url(params, 'launch-context-id')).to eq(expected_url)
    end
  end
end
