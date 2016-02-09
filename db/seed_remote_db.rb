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

def fhir_server(name, url)
  { fhir_server: { name: name, url: url } }.to_json
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

# add_fhir_servers(
#   fhir_server('cerner',      "#{FHIR_SERVER}/may2015/@tenant_id@"),
#   fhir_server('cerner_open', "#{FHIR_SERVER}/may2015/open/@tenant_id@"),
#   fhir_server('cerner_staging', 'https://fhir.stagingcernerpowerchart.com/dstu2/@tenant_id@')
# )

add_smart_apps(
  # smart_app('bf7d70ce-56a9-4096-bc36-d91dfff00854', 'EnrG|Rheum (local dev)',        't', 1, 'http://localhost:4271/PointOfEntry'),
  # smart_app('d63f966e-db03-4f4f-9d17-8c604a7b4dd1', 'EnrG|Rheum (local dev No Auth)','f', 2, 'http://localhost:4271/PointOfEntry'),
  # smart_app('3175a80b-47b7-471b-aba5-d09349ae7526', 'Cardiac Risk',                  't', 1, 'https://fhir.smarthealthit.org/apps/cardiac-risk/launch.html'),
  # smart_app('2dda2e15-9990-4045-b449-00de236b194b', 'BP Percentiles',                't', 1, 'https://fhir.smarthealthit.org/apps/bp-centiles/launch.html'),
  # smart_app('194099bd-080c-48ae-9f0e-5cb1bf559c2a', 'Pediatric Growth Chart',        't', 1, 'https://fhir.smarthealthit.org/apps/growth-chart/launch.html'),
  # smart_app('6bc278b5-c10d-47de-bd19-e3641df492e6', 'Bilirubin Chart',               't', 1, 'http://hspc.isalusconsulting.com/demo/apps/bilirubin-chart/launch.html'),
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
  # smart_app('b45fc6ec-4c77-4d97-a5a1-8c1709c29804', 'InterSystems',                  't', 1, 'https://argonaut.intersystems.com/resp/csp/sys/oauth2/OAuth2.Response.cls' ),
  # smart_app('03d6e496-4005-4827-a6c1-5bdc4d78a6a5', 'Ascend',                        't', 1, 'https://insight.ascendhit.com/Home/Launch' ),
  # smart_app('d7ab7c44-e5eb-4bb3-856a-168a051688b4', 'EnrG|Rheum Test',               't', 1, 'https://xg-demoapps1v.xg.local/EnrGRheum/Test/SecurePointOfEntry/Index' ),
  # smart_app('e4fac650-757e-4127-9607-492e0c92f082', 'EnrG|Rheum Questionnaire Test', 't', 1, 'https://xg-demoapps1v.xg.local/RheumQuestionnaire/Test/SecurePointOfEntry' ),
  # smart_app('a8307594-a60b-4d03-9d2a-cf2fc3e61d96', 'Cerner Direct Referrals (Localhost)', 't', 1, 'http://localhost:8080/gwx-toc-webapp/smart/launch' ),
  # smart_app('2122ef84-ab35-4c7a-88a8-db0a192b5136', 'Cerner SMART App Validator',    't', 1, smart_app_validator_url ),
  # smart_app('1b7bce27-c1d3-4f36-8bad-6e64b649363d', 'RxCheck',                       't', 1, 'https://www.rxcheck.com/fhir/launch' ),
  # smart_app('8ebb0d60-ae59-411c-86dc-9103b71557f4', 'FHIR Client Tool (Avinash Shanbhag from ONC)', 't', 1, 'http://localhost:8080/avifhircliient' ),
  # smart_app('efb76056-47bc-40f9-a818-20e38da82841', 'HealtheIntent Test App', 't', 1, 'http://localhost:3000/smart/launch' ),
  # smart_app('e6beb7e2-f68a-4a12-8e4f-7507f3a4f960', 'EnrG|Rheum (Integration)', 't', 1, 'https://enrg.xghealth.com/EnrGRheum/Integration/SecurePointOfEntry/Index' ),
  # smart_app('d35518be-49bf-404b-9593-a36edc7f4968', 'EnrG|Rheum Questionnaire (Integration)', 't', 1, 'https://enrg.xghealth.com/RheumQuestionnaire/Integration/SecurePointOfEntry' ),
  # smart_app('334afd39-6ad1-4b10-8081-f760a67c94b8', 'Cerner Direct Referrals (DEV)', 't', 1, 'http://dev.gwx.cerner.corp/toc/smart/launch' ),
  # smart_app('8afe32cd-5fdf-4eff-b19b-7c3fb3cdf49e', 'EnrG|Rheum',                    't', 1, 'https://demoapp.xghealth.com/EnrGRheum/Demo/SecurePointOfEntry/Index' ),
  # smart_app('59059b31-700e-411c-a9db-44e57105009a', 'EnrG|Rheum Questionnaire',      't', 1, 'https://demoapp.xghealth.com/RheumQuestionnaire/Demo/SecurePointOfEntry' ),
  # smart_app('4d2a4dea-641f-4627-b1a2-32d53d4a294f', 'Pediatric Drug Card',           't', 1, 'https://webedgedev.co.ihc.com/smartapp/apps/pediatric-drug-card/launch.html' ),
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
  # smart_app('3c15d3e3-0295-4de2-a90b-4ec6a54136db', 'Pediatric Drug Card (localhost)',        't', 1, 'http://localhost:8081/smartapp/apps/pediatric-drug-card/launch.html' ),
  # smart_app('5a68eec4-188d-4e2a-9a34-db9c1268c27e', 'Pediatric Drug Card (verification)',        't', 1, 'https://webedgever.co.ihc.com/smartapp/apps/pediatric-drug-card/launch.html' ),
  # smart_app('6d115b4e-e91b-4741-ae76-c889f034c5c2', 'Meducation Demo',                 't', 1, 'https://fhir-dstu2.meducation.com/launch.html' ),
  # smart_app('93e62de8-2f2c-4168-968d-faffd26d76f9', 'Duke Pillbox',        't', 1, 'http://pillbox.medapptech.com/initapp/launch.html' ),
  # smart_app('bd8f9750-4963-42c6-b433-d98cf7816241', 'ClinDat',                 't', 1, 'https://apps.medapptech.com:9004/fhir-app/launch.html' )

)
