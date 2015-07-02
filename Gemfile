source 'https://rubygems.org'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '4.2.2'
# Use sqlite3 as the database for Active Record
gem 'sqlite3', '~> 1.3'
# Use SCSS for stylesheets
gem 'sass-rails', '~> 5.0'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'
# Use CoffeeScript for .coffee assets and views
gem 'coffee-rails', '~> 4.1.0'
# See https://github.com/rails/execjs#readme for more supported runtimes
gem 'therubyracer', platforms: :ruby, group: :production

# Use jquery as the JavaScript library
gem 'jquery-rails', '~> 4.0'
# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
gem 'turbolinks', '~> 2.5'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.0'
# bundle exec rake doc:rails generates the API under doc/api.
gem 'sdoc', '~> 0.4.0', group: :doc

# Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
gem 'spring',        group: :development

gem 'rack-cors', '~> 0.3' ,:require => 'rack/cors'
gem 'yui-compressor', '0.12.0' # using exact version since different version creates different css compressed file
gem 'sprockets', '~> 2.11.0' # Require to create gzipped assets
gem 'libv8', '~> 3.16.14.11' # Since 3.16.14.9 got yanked, we had to restrict to point to the latest one

group :production do
  gem 'mysql2', '0.3.18'
end

# All gems listed in this group will be updated
# when building via Jenkins. See build.sh file.
group :cerner, :default do
  source 'http://repo.release.cerner.corp/main/rubygems/'
  source 'http://repo.release.cerner.corp/internal/rubygems/'

  gem 'igneous-smart', git: 'http://github.cerner.com/Igneous/igneous-smart.git'
  gem 'timber', '~> 1.7.0', :source => 'http://repo.release.cerner.corp/main/rubygems/'
  gem 'ion_common', '~> 3.7'
  gem 'hi-checkup', '~> 1.6'
end

group :development do
  source 'http://repo.release.cerner.corp/internal/rubygems/'
  source 'http://repo.release.cerner.corp/main/rubygems/'

  gem 'roll_out', '~> 1.10'
  gem 'roll_out-security', '~> 1.3'
  gem 'flatten_jbuilder', '~>1.2.0'
  gem 'philter', '~> 1.8'
end

group :test do
  gem 'rspec-rails', '~> 3.2'
  gem 'combustion', '~> 0.5'
  gem 'simplecov', '~> 0.10'
  gem 'rspec-collection_matchers', '~> 1.1'
end
