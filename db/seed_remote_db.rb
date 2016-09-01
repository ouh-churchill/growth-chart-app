#!/usr/bin/env ruby

require 'json'
require 'net/https'
require 'uri'

unless %w(localhost dev staging sandbox production).include? ARGV[0]
  raise ArgumentError, 'You must specify an environment: localhost|dev|staging|sandbox|production'
end

SMART_SERVER = if 'localhost' == ARGV[0]
                 'http://localhost:3000/smart'
               elsif %w(dev staging sandbox).include? ARGV[0]
                 "https://smart.#{ARGV[0]}cernerpowerchart.com/smart"
               else
                 'https://smart.cernerpowerchart.com/smart'
               end

FHIR_SERVER = if 'localhost' == ARGV[0]
                'http://localhost:3000'
              elsif %w(dev staging sandbox).include? ARGV[0]
                "https://fhir.#{ARGV[0]}cernerpowerchart.com"
              else
                'https://fhir.cernerpowerchart.com'
              end

def post(uri, data)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true if uri.port == 443

  request = Net::HTTP::Post.new(uri.request_uri)
  request.body = data
  request['Content-Type'] = 'application/json'
  request['Accept'] = 'application/json'
  request['cerner-trusted-traffic'] = 'cerner'

  response = http.request(request)
  if %w(201 204).include? response.code
    puts "Success (#{response.code}): #{data}"
  else
    puts "Failure (#{response.code}): #{data}"
  end
end

def add_fhir_servers(*data)
  uri = URI.parse("#{SMART_SERVER}/fhir_servers")
  data.each do | fhir_server |
    post(uri, fhir_server)
  end
end

def add_smart_apps(*data)
  uri = URI.parse("#{SMART_SERVER}/apps")
  data.each do | app |
    post(uri, app)
  end
end

def fhir_server(name, url, secured, public_access)
  { fhir_server: { name: name, url: url, secured: secured, public_access: public_access } }.to_json
end

def smart_app(app_id, name, authorized, fhir_server_id, launch_url)
  { app: {
    app_id: app_id, name: name, launch_url: launch_url, authorized: authorized,
    igneous_smart_fhir_server_id: fhir_server_id }
  }.to_json
end

def smart_app_validator_url
  SMART_SERVER.sub(/smart\z/, 'smart-app-validator/launch.html')
end

def smart_app_validator_url_dstu2
  SMART_SERVER.sub(/smart\z/, 'smart-app-validator-2.0/launch.html')
end

# add_fhir_servers(
#   fhir_server('cerner',            "#{FHIR_SERVER}/may2015/@tenant_id@",                         't', 't'),
#   fhir_server('cerner_open',       "#{FHIR_SERVER}/may2015/open/@tenant_id@",                    'f', 't'),
#   fhir_server('cerner_dstu2',      "#{FHIR_SERVER}/dstu2/@tenant_id@",                           't', 't'),
#   fhir_server('cerner_dstu2_open', "#{FHIR_SERVER}/dstu2/open/@tenant_id@",                      'f', 't'),
#   fhir_server('cerner_staging',    'https://fhir.stagingcernerpowerchart.com/dstu2/@tenant_id@', 't', 't')
# )

add_smart_apps(
  # smart_app('4ae44710-dc6e-4c52-82ef-877106846cab', 'Cardiac Risk App DSTU2', 't', 4, 'https://smart.devcernerpowerchart.com/cardiac-risk-app-2.0/launch.html'),
  # smart_app('ddffda5f-3cdc-4efc-bf98-0b1e58a56537', 'Pediatric Growth Chart App DSTU2', 't', 4, 'https://smart.devcernerpowerchart.com/growth-chart-app-2.0/launch.html'),
  # smart_app('bf7d70ce-56a9-4096-bc36-d91dfff00854', 'EnrG|Rheum (local dev)',        't', 1, 'http://localhost:4271/SecurePointOfEntry'),
  # smart_app('d63f966e-db03-4f4f-9d17-8c604a7b4dd1', 'EnrG|Rheum (local dev No Auth)','f', 2, 'http://localhost:4271/SecurePointOfEntry'),
  # smart_app('3175a80b-47b7-471b-aba5-d09349ae7526', 'Cardiac Risk',                  't', 1, 'https://fhir.smarthealthit.org/apps/cardiac-risk/launch.html'),
  # smart_app('9f204c1f-4910-42a6-832e-6ed0e06800f4', 'BP Percentiles',                '4', 4, 'https://fhir-dstu2.smarthealthit.org/apps/bp-centiles/launch.html')
  # smart_app('194099bd-080c-48ae-9f0e-5cb1bf559c2a', 'Pediatric Growth Chart',        't', 1, 'https://fhir.smarthealthit.org/apps/growth-chart/launch.html'),
  # smart_app('6bc278b5-c10d-47de-bd19-e3641df492e6', 'Bilirubin Chart',               't', 1, 'http://hspc.isalusconsulting.com/demo/apps/bilirubin-chart/launch.html'),
  # smart_app('f2eeeb99-41b8-4f70-b6ad-7976fa8a17d5', 'HSPC Bilirubin Chart',               't', 3, 'https://sandbox.hspconsortium.org/hspc-bilirubin-app/static/bilirubin-chart/launch.html')
  # smart_app('428ae1fb-e9ca-4897-8794-206856254c29', 'Charts',                        't', 1, 'org.chip.ios.charts://'),
  # smart_app('df5dd157-c16a-4f9c-b5aa-d87478e9a6d1', 'Crimson Care Management',       't', 1, 'https://fhirdemo.advisory.com/launcher/launch.html'),
  # smart_app('3b9a8fce-a667-40e0-a94a-4aebe4ea1ac1', 'Healthwise',                    't', 1, 'https://smart.healthwise.net/initialize'),
  # smart_app('0ec20177-cb96-4217-a8d9-1bdce082c7b4', 'Health Ally',                   't', 1, 'https://hspc-portal-conditionplatform-osiamedical.azurewebsites.net/launch.html'),
  # smart_app('6cee11fa-876c-4339-8a40-30ab993cf481', 'Meducation',                    't', 1, 'https://fhir.meducation.com/launch.html'),
  # smart_app('1407ed74-394d-4ceb-b2eb-00a0bcd2a557', 'VisualDX',                      't', 1, 'http://clupea.visualdx.com/visualdx/widgets/smart/launch.html'),
  # smart_app('a9b3e26a-13c3-4888-82c7-ac130bccae55', 'Qvera Argonaut Client',         't', 1, 'http://mhutton-m4700/form/form.html?urlKey=FHIRClient'),
  # smart_app('3203fa36-0431-4ddf-add1-c14a343ca386', 'VisualDX (DSTU 2)',             't', 1, 'https://www.visualdx.com/visualdx/widgets/smart/launch.html'),
  # smart_app('b4c2eb41-3252-41a2-9d38-34aad35db8e7', 'MITRE Crucible',                't', 1, 'http://localhost:4200/'),
  # smart_app('f1ce5e11-ad41-4b57-9afd-ef79f5aeba3b', 'EnrG|Rheum Questionnaire (local dev)', 't', 1, 'http://localhost:4272/SecurePointOfEntry'),
  # smart_app('2dd93cdf-d9cc-4f42-81c7-cc21f86319ea', 'MAEHC',                         't', 1, 'https://dev.qdc.maehc.org/fhir'),
  # smart_app('7a259ec0-4afa-40cc-970e-bef0bfcdb581', 'PRP (Premier Inc)',             't', 1, 'http://localhost:8080/fhir-app/PRPHome.html'),
  # smart_app('303bb2fc-d3b9-48a8-a1ca-af50e10dd277', 'PRP (Premier Inc) DSTU 2',             't', 1, 'http://localhost:8080/fhir-app/PRPHome.html')
  # smart_app('b45fc6ec-4c77-4d97-a5a1-8c1709c29804', 'InterSystems',                  't', 1, 'https://argonaut.intersystems.com/resp/csp/sys/oauth2/OAuth2.Response.cls' ),
  # smart_app('03d6e496-4005-4827-a6c1-5bdc4d78a6a5', 'Ascend',                        't', 1, 'https://insight.ascendhit.com/Home/Launch' ),
  # smart_app('d7ab7c44-e5eb-4bb3-856a-168a051688b4', 'EnrG|Rheum Test',               't', 1, 'https://xg-demoapps1v.xg.local/EnrGRheum/Test/SecurePointOfEntry/Index' ),
  # smart_app('e4fac650-757e-4127-9607-492e0c92f082', 'EnrG|Rheum Questionnaire Test', 't', 1, 'https://xg-demoapps1v.xg.local/RheumQuestionnaire/Test/SecurePointOfEntry' ),
  # smart_app('a8307594-a60b-4d03-9d2a-cf2fc3e61d96', 'Cerner Direct Referrals (Localhost)', 't', 1, 'http://localhost:8080/gwx-toc-webapp/smart/launch' ),
  # smart_app('2122ef84-ab35-4c7a-88a8-db0a192b5136', 'Cerner SMART App Validator',    't', 1, smart_app_validator_url ),
  # smart_app('0a0e0a81-3eba-4142-8da6-3d48fd3d9286', 'Cerner SMART App Validator DSTU2',    't', 4, smart_app_validator_url_dstu2 )
  # smart_app('1b7bce27-c1d3-4f36-8bad-6e64b649363d', 'RxCheck',                       't', 1, 'https://www.rxcheck.com/fhir/launch' ),
  # smart_app('8ebb0d60-ae59-411c-86dc-9103b71557f4', 'FHIR Client Tool (Avinash Shanbhag from ONC)', 't', 1, 'http://localhost:8080/avifhircliient' ),
  # smart_app('efb76056-47bc-40f9-a818-20e38da82841', 'HealtheIntent Test App', 't', 1, 'http://localhost:3000/smart/launch' ),
  # smart_app('e6beb7e2-f68a-4a12-8e4f-7507f3a4f960', 'EnrG|Rheum (Integration)', 't', 1, 'https://enrg.xghealth.com/EnrGRheum/Integration/SecurePointOfEntry/Index' ),
  # smart_app('d35518be-49bf-404b-9593-a36edc7f4968', 'EnrG|Rheum Questionnaire (Integration)', 't', 1, 'https://enrg.xghealth.com/RheumQuestionnaire/Integration/SecurePointOfEntry' ),
  # smart_app('334afd39-6ad1-4b10-8081-f760a67c94b8', 'Cerner Direct Referrals (DEV)', 't', 1, 'http://dev.gwx.cerner.corp/toc/smart/launch' ),
  # smart_app('8afe32cd-5fdf-4eff-b19b-7c3fb3cdf49e', 'EnrG|Rheum',                    't', 1, 'https://demoapp.xghealth.com/EnrGRheum/Demo/SecurePointOfEntry/Index' ),
  # smart_app('59059b31-700e-411c-a9db-44e57105009a', 'EnrG|Rheum Questionnaire',      't', 1, 'https://demoapp.xghealth.com/RheumQuestionnaire/Demo/SecurePointOfEntry' ),
  # smart_app('4d2a4dea-641f-4627-b1a2-32d53d4a294f', 'Pediatric Drug Card',           't', 4, 'https://webedgedev.co.ihc.com/smartapp/apps/pediatric-drug-card/launch.html' ),
  # smart_app('1bb4ba64-a2f5-4e8c-8e18-569acb5effe5', 'Eligible Argonaut Client',      't', 1, 'http://localhost:8000/fhir-app/index.html' ), #Note: Not launch URL, don't have SMART *yet*
  # smart_app('9c558021-c9af-41f6-a603-65826c43fe9e', 'UpToDate Search, SMART on FHIR Prototype',      't', 1, 'http://s5www.utdlab.com/prototype1/launch-new.html' ),
  # smart_app('da2106e1-d2da-4ac8-bbca-a5392c96411a', 'EnrG|Rheum (DEAC_MT)',                    't', 1, 'https://www.enrgrheum.xghealth.com/EnrGRheum/Billings/SecurePointOfEntry' ),
  # smart_app('6bb9dc25-615d-42a5-a288-4bfbdb56d9fd', 'EnrG|Rheum Questionnaire (DEAC_MT)',      't', 1, 'https://www.enrgrheum.xghealth.com/RheumQuestionnaire/Billings/SecurePointOfEntry' ),
  # smart_app('c3c1fbc7-698a-4e83-adfa-553e285afab3', 'RxCheck (Localhost)',           't', 1, 'http://localhost:3000' ),
  # smart_app('47d041ba-4bbf-40d0-a305-5d9418ab592b', 'NEXTGEN HEALTHCARE',            't', 1, 'http://localhost/HieGatewayAdministrationFhirBranch/1/2/rhioconfig/RedirectOAuth2' ), #Not launch URL, not launch capable yet
  # smart_app('a4f64cc5-e30e-4bf0-a116-8d510f36b290', 'DHI Cardiac Risk',              't', 1, 'http://dig64au.vsp.sas.com/DHICardiacRisk' ),
  # smart_app('1187eeee-0343-457a-82c7-a28fd1dff70b', 'LLIT on FHIR',                  't', 1, 'http://pfz-133-smart-d.appno.net:8000/fhir-app/launch.html' ),
  # smart_app('5bd4e540-d6cd-4dc8-9080-432532b0361e', 'MAEHC OAuth 2 Test',              't', 1, 'https://dev.qdc.maehc.org/FHIR/OAuth20Test.aspx' ),
  # smart_app('e26acd85-9394-4f95-9abc-07953d28de4b', 'HexCare',                         't', 1, 'https://hex.care' ),
  # smart_app('f6f6d7c4-3272-4923-8b19-49b7128c0ebc', 'BCH BP Centiles App Test',        't', 1, 'http://localhost/bpcentiles/launch.html' ),
  # smart_app('48823dac-e7a0-4200-a284-2f8c2cf86955', 'Pionetechs FHIR Test',            't', 1, 'https://cernerfhir.azurewebsites.net/smart' ),
  # smart_app('2d10098b-d709-4197-a332-52c493e8e000', 'BCH Growth Chart App Test',        't', 1, 'http://localhost/growthchart/launch.html' ),
  # smart_app('c0144077-3b73-4ad5-b6fc-63a022a12ead', 'HSP Bilirubin Chart',        't', 1, 'https://sandbox.hspconsortium.org/hsp-bilirubin-app/static/bilirubin-chart/launch.html' ),
  # smart_app('3c15d3e3-0295-4de2-a90b-4ec6a54136db', 'Pediatric Drug Card (localhost)',        't', 4, 'http://localhost:8081/smartapp/apps/pediatric-drug-card/launch.html' ),
  # smart_app('5a68eec4-188d-4e2a-9a34-db9c1268c27e', 'Pediatric Drug Card (verification)',        't', 4, 'https://webedgever.co.ihc.com/smartapp/apps/pediatric-drug-card/launch.html' ),
  # smart_app('6d115b4e-e91b-4741-ae76-c889f034c5c2', 'Meducation Demo',                 't', 1, 'https://fhir-dstu2.meducation.com/launch.html' ),
  # smart_app('93e62de8-2f2c-4168-968d-faffd26d76f9', 'Duke Pillbox',        't', 1, 'http://pillbox.medapptech.com/initapp/launch.html' ),
  # smart_app('bd8f9750-4963-42c6-b433-d98cf7816241', 'ClinDat',                 't', 1, 'https://apps.medapptech.com/fhir-app/launch.html' ),
  # smart_app('56741517-8b1d-4eda-874d-528d6b9c4217', 'MyFamily',        't', 1, 'http://ccfmyfam.azurewebsites.net' ), #Note: Doesn't currently support SMART launch, url won't work
  # smart_app('5d64bd5c-17b0-4887-812d-c97b3a47d070', 'TeamNotes',                 't', 1, 'https://fhirtest.salarinc.com/OAuth/Launch.aspx' ),
  # smart_app('bd30e373-b7f0-4e2e-a27f-fafaf84d82cc', 'Premier App',                 't', 4, 'http://localhost:8080/fhir-app/PRPHome.html'),
  # smart_app('03ed376f-f507-4855-9e73-72a3f2ca5076', 'Premier App Sample',          't', 4, 'http://localhost:8080/fhir-app/PRPHome.html'),
  # smart_app('15eca7cf-7d58-4bfa-b0ed-5e66f143ceb5', 'medicity',                 't', 4, 'https://medicity-fhir.x.healthagen.com'),
  # smart_app('d461dfb8-45bd-4291-80c6-091741c3dd79', 'Bespoke Argonaut Test Client',                 't', 4, 'https://www.getpostman.com/oauth2/callback'), #Can't actually launch via SMART
  # smart_app('50367cff-9ab2-458a-905f-19ccb96c476a', 'Diagnotes Development',                 't', 1, 'https://dn-marlon.ngrok.io/smart/launch'),
  # smart_app('6a35fdd3-8ffe-43ad-b87e-6897232b1660', 'Edifecs FHIR',                 't', 4, 'http://localhost:8080/FHIRApp/cernersmartlaunch'),
  # smart_app('f58c446c-2df5-4e89-8c4a-acda83ed8291', 'TriVox',           't', 4, 'https://bch.trivoxhealth.com/v1/smart/launch.html'),
  # smart_app('8b8c17a2-92ec-4f80-ad12-f502ab878634', 'BCH Growth Chart', 't', 4, 'https://smartprd1.tch.harvard.edu/growthchart/launch.html'),
  # smart_app('202b1cdb-452f-4224-b102-7be87a9ba10b', 'BCH BP Centiles',  't', 4, 'https://smartprd1.tch.harvard.edu/bpcentiles/launch.html'),
  # smart_app('c51e0393-005b-4009-8265-00622c3ff9f5', 'CareRX HUB', 't', 4, 'http://carerx.info/IOT'),
  # smart_app('3710b5f7-d6c7-4792-ae19-f22d85dfd42f', 'OpenHRE',  't', 4, 'http://smart.openhre.org:8126/smart/launch.html'),
  # smart_app('7ff78148-82f9-4a68-ba4f-194089d7d083', 'My eHealth',  't', 4, 'smartapp://callback'),
  # smart_app('e2868099-eab9-4c4c-97da-4ca414b24933', 'VigiLanz SMARTDemo',  't', 4, 'https://www.vigilanzportal.com/FHIRClient/Launch/SMARTLaunch'),
  # smart_app('37c8edca-8ad5-40fa-b396-d2efe6c2c9a0', 'VigiLanz SMARTDemo Dev',  't', 4, 'http://localhost:8000/fhir-app/Launch/SMARTLaunch'),
  # smart_app('37f6e262-e3d4-42c0-a5b8-e66192b58e07', 'Nurse Dashboard Auth POC',  't', 1, 'http://ec2-52-21-191-250.compute-1.amazonaws.com:3020/api/launch/app/patientDashboard/tenant/780634a0-e7ce-11e5-8a20-b7bbc3c65fa5'),
  # smart_app('6e9420ce-6706-43d5-97d7-b59ce518d497', 'Sensotrend Diabetes Diary - Dev',  't', 4, 'http://localhost.localdomain:8080/api/fhir/paivakirja'),
  # smart_app('c299c3a0-5a8b-4985-ac56-74bf072a072e', 'Sensotrend Diabetes Diary',  't', 4, 'https://www.sensotrend.fi/api/fhir/paivakirja'),
  # smart_app('f8ab32f8-d719-4a96-bb6c-fb89ba9797cb', 'EnrG|Rheum (local dev DSTU 2)',        't', 4, 'http://localhost:4271/SecurePointOfEntry'),
  # smart_app('6e8a2784-6575-489b-a59d-d0784ff73d98', 'HIEBus',        't', 4, 'http://localhost:50000/SmartApp/Launch'),
  # smart_app('bf9496e9-cc51-4911-9dd7-ba35649ea1d7', 'Healthwise Care Management Solution', 't', 4, 'https://coach.healthwise.net/smart/launch'),
  # smart_app('c3862f80-4ea8-409b-9d76-68287e1435d6', 'Healthwise Patient Engagement Solution', 't', 4, 'https://emr.healthwise.net/smart/launch'),
  # smart_app('d42f11bf-bea3-4f7f-9562-79a918e9a2c8', 'Healthwise Dev Solution', 't', 4, 'http://localhost:50865/smart/launch'),
  # smart_app('72fbe1ea-0d89-4b81-ae6c-a43b644f3025', 'Green Circle Health', 't', 4, 'https://testing.gogch.com/app'),
  # smart_app('b14872f2-37f1-4ea7-8b56-f21019748a09', 'MyLinks', 't', 4, 'http://localhost/'),
  # smart_app('25a189c2-4855-48fa-a28c-101923196df9', 'Juxly TIMELINE', 't', 4, 'https://timeline-test.juxly.com/cerner/launch.html'),
  # smart_app('25a189c2-4855-48fa-a28c-101923196df9', 'Juxly TIMELINE Dev', 't', 4, 'http://localhost:8000/cerner/launch.html'),
  # smart_app('2ad5fbbd-d5d7-4da4-a5e8-521624886e0d', 'DatycsAssist', 't', 4, 'https://cds.datycs.com:8443/DatycsAssist/api/service/cernerlaunch'),
  # smart_app('cfd8e34c-7897-44fb-98b1-da0dceea721a', 'Finrisk calculator', 't', 3, 'http://fhir.ebmeds.org/smart/finrisk-calculator/launch.html'),
  # smart_app('598198a5-e174-460c-be6c-339c93f9e4c7', 'TigerText Clinical Messaging', 't', 4, 'https://tigertextjeff.azurewebsites.net/internal/vendors/cerner/launch.aspx'),
  # smart_app('383b14e9-d1fa-4ef6-b333-854fd7303793', 'DocEdge', 't', 1, ' http://fhir.providentedge.com/launch.html'),
  # smart_app('8b977bb9-a5a9-427d-90b9-9ed6d69749b3', 'Juxly Timeline Dev', 't', 4, 'http://localhost:8000/fhir-app/launch.html'),
  # smart_app('86e33fec-649d-49cb-ae42-460981d53e8a', 'S4S: App Demo', 't', 4, 'https://app.demo.syncfor.science/launch/cerner'),
  # smart_app('39086be6-86ad-4fc4-a235-c88296770a5d', 'S4S: App Demo Test', 't', 4, 'https://app.demo-test.syncfor.science/launch/cerner'),
  # smart_app('ca2b3256-b00d-4f09-9fb6-5976e5cd82be', 'S4S: App Dev', 't', 4, 'http://app.dev.syncfor.science:9001/launch/cerner'),
  # smart_app('7041cb64-d862-4320-b900-a8c771231852', 'S4S: Crucible Dev', 't', 4, 'http://crucible.dev.syncfor.science:9004/launch'),
  # smart_app('b0cea5fb-b2ee-49a3-b605-e9ef8b19caf2', 'S4S: Crucible Demo', 't', 4, 'https://crucible.demo.syncfor.science/launch'),
  # smart_app('3e4f22e1-2af4-41bf-aa2e-ef9ee003793f', 'S4S: Crucible Demo Test', 't', 4, 'https://crucible.demo-test.syncfor.science/launch')
  # smart_app('e82b8d7e-c4bf-401c-9393-fbd92667eed2', 'S4S: Tests Dev', 't', 4, 'http://tests.dev.syncfor.science:9003/launch/cerner/'),
  # smart_app('53cec9d0-5ac1-4f60-a0de-1eff740320d0', 'S4S: Tests Demo', 't', 4, 'https://tests.demo.syncfor.science/launch/cerner/'),
  # smart_app('8a9d1df6-5520-4efc-864d-ee635ec84208', 'S4S: Tests Demo Test', 't', 4, 'https://tests.demo-test.syncfor.science/launch/cerner/'),
  # smart_app('b510f466-72ae-47d2-85d5-f7a1ae36a614', 'CoMET', 't', 4, 'https://localhost/fhir-app'),
  # smart_app('8bf869b3-9003-42b0-897a-94ef6cbe90a1', 'Nuance', 't', 4, 'http://localhost:8585'),
  # smart_app('96ff31f1-c1df-437f-a8ca-bee0c2657e51', 'Medical Necessity', 't', 4, 'https://www.automatedmd.com/Callback/Cerner/Launch.pl'),
  # smart_app('d0a3d2e1-7d3b-40e9-9b5c-be906a0d7db0', 'CHFPredictiveAnalytics', 't', 4, 'http://223.31.99.62:8000/CHFPredictiveAnalytics/launch.html'),
  # smart_app('75c2941b-0fd1-485b-9375-88209b7f0ddb', 'Clinical Decision Support', 't', 4, 'http://utd03830:8080/acds/launch/ringmaster'),
  # smart_app('48c70d9d-987d-466e-844e-82365a2f6e1a', 'MedSafe', 't', 4, 'http://gs:3000/launch'),
  # smart_app('07afc4d1-2a22-47f5-ae00-5d7a0c172717', 'PDemo', 't', 4, 'http://localhost:50143/Public/PDemo/PDemo.html'), #Not truly SMART capable, can remove after launch no longer reqd
  # smart_app('38bec537-a706-4563-9242-7d4432bc6500', 'Loopback FHIR Test', 't', 4, 'http://localhost:11890/Home/Login'),
  # smart_app('ce1e6662-b08f-400f-8c96-328d91511c1a', 'HACI Timeline (Localhost)', 't', 4, 'http://localhost:8000/launch.html'),
  # smart_app('d94d2955-810d-4242-92ae-fdf7a6745db9', 'EAPathways (Dev)', 't', 4, 'http://pathways.developmentdemo.com/launch.html'),
  # smart_app('cc092a4d-ca40-4168-84e4-9e86c9d45406', 'ePreop SurgicalValet (DEVELOPMENT)', 't', 4, 'https://services.dev.epreop.com/ExternalServices/OpenIdConnect10/Launch.aspx'),
  # smart_app('46df0b7b-ca9a-4b4a-ba9f-083f52f0469e', 'DIASYST', 't', 4, 'https://emr.diasyst.com/cerner/launch'),
  # smart_app('31df47af-bb5d-4291-9d87-504e078cc9c8', 'SMART on FHIR Starter App', 't', 4, 'https://parthivbhagat.github.io/pb026393.github.io/launch.html'),
  # smart_app('8612902c-dd96-4703-b2be-2ac064b23437', 'EAPathways', 't', 4, 'https://peopleconnectmore-dev.carolinas.org/aspxapps/LCIPathways/launch.html'),
  # smart_app('3090076c-d6a0-4ebf-b819-0905fcdfa1c1', 'MedCalc 3000', 't', 4, 'https://fhircalc.com/static/ACCAHA2013.htm'),
  # smart_app('a1952130-a00e-43d9-b6be-a50588bc9114', 'ARUP Test App - Walt', 't', 4, 'http://localhost:42406/Launch/Index'),
  # smart_app('fe1ceae0-03fd-45ec-b036-27e208619890', 'HealtheInsights JF8275 Test', 't', 4, 'http://m1600563.cerner.com:3000/smart'),
  # smart_app('0fe652e7-8e87-4b47-a45f-c7bfe80772ff', 'HealtheInsights JF8275 Localhost', 't', 4, 'http://localhost:3000/smart'),
  # smart_app('ca98095c-f14a-41a8-bdee-2b880e88d343', 'Syapse (localhost)', 't', 4, 'http://localhost:8000/login/fhir-oauth2'),
  # smart_app('4ea0d2cf-ed87-470d-9fc3-e3d5548f353f', 'FHIR Bridge to DHP POC (Encounter Summar)', 't', 4, 'http://leo.i3l.gatech.edu:8000/sendEncounterSummary/'),
  # smart_app('2547eceb-bb08-42fd-8f72-cb48a20744b3', 'FHIR Bridge to DHP POC (Referral Request)', 't', 4, 'http://leo.i3l.gatech.edu:8000/sendReferralRequest/'),
  # smart_app('a3edbaca-9539-4605-bbcf-f114292a59ae', 'Cardiac Risk App (testing blue/green)', 't', 1, 'https://smart-latest.sandboxcernerpowerchart.com/cardiac-risk-app/launch-latest.html'),
  # smart_app('d84e1b63-ada4-4015-8d1e-5fa0984b97ae', 'Cardiac Risk App DSTU2 (testing blue/green)', 't', 4, 'https://smart-latest.sandboxcernerpowerchart.com/cardiac-risk-app-2.0/launch-latest.html'),
  # smart_app('b2e9080f-54b9-44d2-a0b3-e643c9c43338', 'Pediatric Growth Chart App (testing blue/green)', 't', 1, 'https://smart-latest.sandboxcernerpowerchart.com/growth-chart-app/launch-latest.html'),
  # smart_app('613be291-b868-4597-af78-6fe222a98a5d', 'Pediatric Growth Chart App DSTU2 (testing blue/green)', 't', 4, 'https://smart-latest.sandboxcernerpowerchart.com/growth-chart-app-2.0/launch-latest.html'),
  # smart_app('bfc562e2-f9e5-4d1b-95c1-f01ca81f64de', 'Cerner SMART App Validator (testing blue/green)', 't', 1, 'https://smart-latest.sandboxcernerpowerchart.com/smart-app-validator/launch-latest.html'),
  # smart_app('78b31f8e-51d8-479f-a68d-2a5ae4f7b8d0', 'Cerner SMART App Validator DSTU2 (testing blue/green)', 't', 4, 'https://smart-latest.sandboxcernerpowerchart.com/smart-app-validator-2.0/launch-latest.html'),
  # smart_app('a3edbaca-9539-4605-bbcf-f114292a59ae', 'Cardiac Risk App (testing blue/green)', 't', 1, 'https://smart-latest.cernerpowerchart.com/cardiac-risk-app/launch-latest.html'),
  # smart_app('d84e1b63-ada4-4015-8d1e-5fa0984b97ae', 'Cardiac Risk App DSTU2 (testing blue/green)', 't', 3, 'https://smart-latest.cernerpowerchart.com/cardiac-risk-app-2.0/launch-latest.html'),
  # smart_app('b2e9080f-54b9-44d2-a0b3-e643c9c43338', 'Pediatric Growth Chart App (testing blue/green)', 't', 1, 'https://smart-latest.cernerpowerchart.com/growth-chart-app/launch-latest.html'),
  # smart_app('613be291-b868-4597-af78-6fe222a98a5d', 'Pediatric Growth Chart App DSTU2 (testing blue/green)', 't', 3, 'https://smart-latest.cernerpowerchart.com/growth-chart-app-2.0/launch-latest.html'),
  # smart_app('bfc562e2-f9e5-4d1b-95c1-f01ca81f64de', 'Cerner SMART App Validator (testing blue/green)', 't', 1, 'https://smart-latest.cernerpowerchart.com/smart-app-validator/launch-latest.html'),
  # smart_app('78b31f8e-51d8-479f-a68d-2a5ae4f7b8d0', 'Cerner SMART App Validator DSTU2 (testing blue/green)', 't', 3, 'https://smart-latest.cernerpowerchart.com/smart-app-validator-2.0/launch-latest.html'),
)
