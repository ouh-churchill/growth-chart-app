#!/usr/bin/env rake
# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require File.expand_path('../config/application', __FILE__)
require 'roll_out/jira' if defined?(RollOut::JIRA)
require 'roll_out/security' if defined?(RollOut::Security)

#load common rake files
ion_common_location = File.join(Gem::Specification.find_all_by_name('ion_common').first.full_gem_path, 'lib', 'tasks')
Dir.glob(ion_common_location + '/*.rake', &method(:load))

require 'rake/clean'
# define the intermediary artifacts that 'clean' removes
CLEAN.include ['Gemfile.lock', 'target/coverage', 'target/doc', 'target/reports']

# items in CLEAN and CLOBBER
CLOBBER.include ['target/site', 'target/*.gem']

Rails.application.load_tasks
