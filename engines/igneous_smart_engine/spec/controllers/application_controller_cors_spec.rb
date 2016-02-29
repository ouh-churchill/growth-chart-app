require 'rack/cors'

describe Igneous::Smart::ApplicationController do

  let(:origin) { 'http://test.example.com' }
  let(:accept) { '*/*' }
  let(:access_control_allow_methods) { 'GET, OPTIONS, HEAD' }
  let(:access_control_expose_headers) { 'ETag, Content-Location, Location, X-Request-Id' }
  let(:app) {
    Rack::Builder.app do
      use Rack::Cors do
        allow do
          origins '*'
          resource '*',
                   credentials: false,
                   headers: :any,
                   methods: [:get, :options, :head],
                   max_age: 0,
                   expose: ['ETag', 'Content-Location', 'Location', 'X-Request-Id']
        end
      end
      run -> (_) { [200, {}, ''] }
    end
  }
  let(:request) { Rack::MockRequest.new(app) }

  context 'when processing non- cross-origin requests' do

    it 'should not include access control headers when the Origin request header is not present' do

      response = request.get('/cors')

      expect(response.headers['Access-Control-Allow-Origin']).to be_nil
      expect(response.headers['Access-Control-Allow-Methods']).to be_nil
      expect(response.headers['Access-Control-Max-Age']).to be_nil
      expect(response.headers['Access-Control-Allow-Credentials']).to be_nil
      expect(response.headers['Access-Control-Expose-Headers']).to be_nil
    end
  end

  context 'when processing cross-origin OPTIONS requests' do

    it 'should include access control headers with the response' do

      response = request.options('/cors', 'HTTP_ORIGIN' => origin, 'HTTP_ACCEPT' => accept)

      expect(response.headers['Access-Control-Allow-Origin']).to eq('*')
      expect(response.headers['Access-Control-Allow-Methods']).to eq(access_control_allow_methods)
      expect(response.headers['Access-Control-Max-Age']).to eq('0')
      expect(response.headers['Access-Control-Allow-Credentials']).to be_nil
      expect(response.headers['Access-Control-Expose-Headers']).to eq(access_control_expose_headers)
      expect(response.status).to eq(200)
      expect(response.body).to eq('')
    end

    it 'should include access control headers and respond with a status of 200 for preflight requests' do

      response = request.options('/cors', 'HTTP_ORIGIN' => origin,
                                          'HTTP_ACCEPT' => accept,
                                          'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'OPTIONS')

      expect(response.headers['Access-Control-Allow-Origin']).to eq('*')
      expect(response.headers['Access-Control-Allow-Methods']).to eq(access_control_allow_methods)
      expect(response.headers['Access-Control-Max-Age']).to eq('0')
      expect(response.headers['Access-Control-Allow-Credentials']).to be_nil
      expect(response.headers['Access-Control-Expose-Headers']).to eq(access_control_expose_headers)
      expect(response.status).to eq(200)
      expect(response.body).to eq('')
    end
  end

  context 'when processing cross-origin GET requests' do

    it 'should include access control headers with the response' do

      response = request.get('/cors', 'HTTP_ORIGIN' => origin,
                                      'HTTP_ACCEPT' => accept,
                                      'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET')

      expect(response.headers['Access-Control-Allow-Origin']).to eq('*')
      expect(response.headers['Access-Control-Allow-Methods']).to eq(access_control_allow_methods)
      expect(response.headers['Access-Control-Max-Age']).to eq('0')
      expect(response.headers['Access-Control-Allow-Credentials']).to be_nil
      expect(response.headers['Access-Control-Expose-Headers']).to eq(access_control_expose_headers)
      expect(response.status).to eq(200)
      expect(response.body).to eq('')
    end
  end
end
