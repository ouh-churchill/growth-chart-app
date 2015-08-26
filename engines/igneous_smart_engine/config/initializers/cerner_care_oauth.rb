require 'oauth'

CERNER_CARE_OAUTH = YAML.load_file("#{Rails.root}/config/cerner_care_oauth.yml")[Rails.env].symbolize_keys

# Configure CernerCare OAuth Consumer
oauth_key = CERNER_CARE_OAUTH[:oauth_key]
raise ArgumentError, 'CERNER_CARE_OAUTH[:oauth_key] is nil' unless oauth_key
oauth_secret = CERNER_CARE_OAUTH[:oauth_secret]
raise ArgumentError, 'CERNER_CARE_OAUTH[:oauth_secret] is nil' unless oauth_secret
oauth_access_token_url = CERNER_CARE_OAUTH[:oauth_access_token_url]
raise ArgumentError, 'CERNER_CARE_OAUTH[:oauth_access_token_url] is nil' unless oauth_access_token_url
Igneous::Smart.cerner_care_oauth_consumer = OAuth::Consumer.new(oauth_key,
                                                                oauth_secret,
                                                                access_token_url: oauth_access_token_url,
                                                                signature_method: 'PLAINTEXT')
