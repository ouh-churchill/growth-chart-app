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
#   fhir_server('cerner_open', "#{FHIR_SERVER}/may2015/open/@tenant_id@")
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
  # smart_app('4d2a4dea-641f-4627-b1a2-32d53d4a294f', 'Pediatric Drug Card',           't', 1, 'https://webedgedev.co.ihc.com/smartapp/apps/pediatric-drug-card/launch.html' )
  # smart_app('1bb4ba64-a2f5-4e8c-8e18-569acb5effe5', 'Eligible Argonaut Client',      't', 1, 'http://localhost:8000/fhir-app/index.html' ) #Note: Not launch URL, don't have SMART *yet*
  # smart_app('9c558021-c9af-41f6-a603-65826c43fe9e', 'UpToDate Search, SMART on FHIR Prototype',      't', 1, 'http://s5www.utdlab.com/prototype1/launch-new.html' )
)
