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

add_fhir_servers(
  fhir_server('cerner',      "#{FHIR_SERVER}/dstu2/@tenant_id@"),
  fhir_server('cerner_open', "#{FHIR_SERVER}/dstu2/open/@tenant_id@")
)

add_smart_apps(
  smart_app('bf7d70ce-56a9-4096-bc36-d91dfff00854', 'EnrG|Rheum',              't', 1, 'http://localhost:4271/PointOfEntry'),
  smart_app('d63f966e-db03-4f4f-9d17-8c604a7b4dd1', 'EnrG|Rheum (No Auth)',    'f', 2, 'http://localhost:4271/PointOfEntry'),
  smart_app('3175a80b-47b7-471b-aba5-d09349ae7526', 'Cardiac Risk',            't', 1, 'https://fhir.smarthealthit.org/apps/cardiac-risk/launch.html'),
  smart_app('2dda2e15-9990-4045-b449-00de236b194b', 'BP Percentiles',          't', 1, 'https://fhir.smarthealthit.org/apps/bp-centiles/launch.html'),
  smart_app('194099bd-080c-48ae-9f0e-5cb1bf559c2a', 'Pediatric Growth Chart',  't', 1, 'https://fhir.smarthealthit.org/apps/growth-chart/launch.html'),
  smart_app('6bc278b5-c10d-47de-bd19-e3641df492e6', 'Bilirubin Chart',         't', 1, 'http://hspc.isalusconsulting.com/demo/apps/bilirubin-chart/launch.html'),
  smart_app('428ae1fb-e9ca-4897-8794-206856254c29', 'Charts',                  't', 1, 'org.chip.ios.charts://'),
  smart_app('df5dd157-c16a-4f9c-b5aa-d87478e9a6d1', 'Crimson Care Management', 't', 1, 'https://fhirdemo.advisory.com/launcher/launch.html'),
  smart_app('3b9a8fce-a667-40e0-a94a-4aebe4ea1ac1', 'Healthwise',              't', 1, 'https://smart.healthwise.net/initialize'),
  smart_app('0ec20177-cb96-4217-a8d9-1bdce082c7b4', 'Health Ally',             't', 1, 'https://hspc-portal-conditionplatform-osiamedical.azurewebsites.net/launch.html'),
  smart_app('6cee11fa-876c-4339-8a40-30ab993cf481', 'Meducation',              't', 1, 'https://fhir.meducation.com/launch.html'),
  smart_app('1407ed74-394d-4ceb-b2eb-00a0bcd2a557', 'VisualDX',                't', 1, 'http://clupea.visualdx.com/visualdx/widgets/smart/launch.html')
)
