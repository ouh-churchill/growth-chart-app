require 'securerandom'
require 'igneous/smart/launch_context'

describe Igneous::Smart::LaunchContext do
  let(:launch_context) { Igneous::Smart::LaunchContext.new }

  describe '#context' do

    it 'creates launch context hash' do

      params = {
        'pat_personid'   => '1',
        'pat_pprcode'    => '2',
        'vis_encntrid'   => '3',
        'usr_personid'   => '4',
        'usr_positioncd' => '5',
        'dev_location'   => '6',
        'app_appname'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'true',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)

      context = Igneous::Smart::LaunchContext.find_by context_id: context_id
      expect(context.context_id).to eq '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      expect(JSON.parse(context.data)).to include('patient' => '1', 'ppr' => '2', 'encounter' => '3',
                                                  'user' => '4', 'position' => '5', 'device_location' => '6',
                                                  'container_name' => '7')
      expect(context.app_id).to eq app_id
      expect(context.smart_launch_url).to eq smart_launch_url
      expect(context.tenant).to eq params['ehr_source_id']
      expect(context.need_patient_banner).to eq true
    end

    it 'accepts query parameters with lower case' do

      params = {
        'pat_personid'   => '1',
        'pat_pprcode'    => '2',
        'vis_encntrid'   => '3',
        'usr_personid'   => '4',
        'usr_positioncd' => '5',
        'dev_location'   => '6',
        'app_appname'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'false',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)

      context = Igneous::Smart::LaunchContext.find_by context_id: context_id
      expect(context.context_id).to eq '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      expect(JSON.parse(context.data)).to include('patient' => '1', 'ppr' => '2', 'encounter' => '3',
                                                  'user' => '4', 'position' => '5', 'device_location' => '6',
                                                  'container_name' => '7')
      expect(context.app_id).to eq app_id
      expect(context.smart_launch_url).to eq smart_launch_url
      expect(context.tenant).to eq params['ehr_source_id']
      expect(context.need_patient_banner).to eq false
    end

    it 'constructs an empty SMART context when no params are present' do

      params = {
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      }
      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)

      context = Igneous::Smart::LaunchContext.find_by context_id: context_id
      expect(JSON.parse(context.data)).to be_empty
      expect(context.need_patient_banner).to eq false
    end

    it 'constructs a complete SMART context when all params are present' do

      params = {
        'pat_personid'   => '1',
        'pat_pprcode'    => '2',
        'vis_encntrid'   => '3',
        'usr_personid'   => '4',
        'usr_positioncd' => '5',
        'dev_location'   => '6',
        'app_appname'    => '7',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'false',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)

      context = Igneous::Smart::LaunchContext.find_by context_id: context_id
      expect(JSON.parse(context.data)).to include('patient' => '1', 'ppr' => '2', 'encounter' => '3',
                                                  'user' => '4', 'position' => '5', 'device_location' => '6',
                                                  'container_name' => '7')
      expect(context.need_patient_banner).to eq false
    end

    it 'strips .00 added by PowerChart from all numeric parameter values' do
      params = {
        'pat_personid' => '1.00',
        'vis_encntrid' => '2.00',
        'dev_location' => 'East Wing',
        'app_appname'  => 'Spec Test',
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'false',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)

      context = Igneous::Smart::LaunchContext.find_by context_id: context_id
      expect(JSON.parse(context.data)).to include('patient' => '1', 'encounter' => '2',
                                                  'device_location' => 'East Wing',
                                                  'container_name' => 'Spec Test')
      expect(context.need_patient_banner).to eq false
    end

    it 'will not add key, value pair when value is not supplied or nil' do
      params = {
        'pat_personid' => '1.00',
        'vis_encntrid' => '2.00',
        'pat_pprcode' => nil,
        'dev_location' => nil,
        'app_appname'  => nil,
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'false',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)
      context = Igneous::Smart::LaunchContext.find_by context_id: context_id

      expect(JSON.parse(context.data)).to include('patient' => '1', 'encounter' => '2')
      expect(JSON.parse(context.data)).to_not include('ppr' => '0', 'device_location' => nil,
                                                      'container_name' => nil)
      expect(context.need_patient_banner).to eq false
    end

    it 'will not add key, value pair when value supplied has value <= 0' do
      params = {
        'pat_personid' => '1.00',
        'vis_encntrid' => '0.00',
        'pat_pprcode' => '324',
        'dev_location' => nil,
        'app_appname'  => nil,
        'ehr_source_id'  => '46134c2c-7412-4d53-b09e-e8ced4c73dbc',
        'need_patient_banner' => 'false',
        'username' => 'test_username'
      }

      context_id = '46134c2c-7412-4d53-b09e-e8ced4c73dbc'
      app_id = 'd193fa79-c165-4daa-a8fd-c187fba2af4d'
      smart_launch_url = 'http://example.com/smart/launch.html'
      allow(SecureRandom).to receive(:uuid).and_return(context_id)
      launch_context.context(params, app_id, smart_launch_url)
      context = Igneous::Smart::LaunchContext.find_by context_id: context_id

      expect(JSON.parse(context.data)).to include('patient' => '1', 'ppr' => '324')
      expect(JSON.parse(context.data)).to_not include('encounter' => '0.00', 'device_location' => nil,
                                                      'container_name' => nil)
      expect(context.context_id).to eq('46134c2c-7412-4d53-b09e-e8ced4c73dbc')
      expect(context.username).to eq('test_username')
      expect(context.app_id).to eq('d193fa79-c165-4daa-a8fd-c187fba2af4d')
      expect(context.smart_launch_url).to eq('http://example.com/smart/launch.html')
      expect(context.tenant).to eq('46134c2c-7412-4d53-b09e-e8ced4c73dbc')
      expect(context.need_patient_banner).to eq false

    end
  end
end
