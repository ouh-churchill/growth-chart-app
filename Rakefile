#!/usr/bin/env rake
# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require File.expand_path('../config/application', __FILE__)
require 'roll_out/jira' if defined?(RollOut::JIRA)
require 'roll_out/security' if defined?(RollOut::Security)
require 'philter/lint_results' if defined?(Philter::LintResults)

# load common rake files
ion_common_location = File.join(Gem::Specification.find_all_by_name('ion_common').first.full_gem_path, 'lib', 'tasks')
Dir.glob(ion_common_location + '/*.rake', &method(:load))

require 'rake/clean'

# define the intermediary artifacts that 'clean' removes
CLEAN.include %w(coverage target)

Rails.application.load_tasks

if ENV['RAILS_ENV'] != 'production'
  require 'rspec/core'
  require 'rspec/core/rake_task'

  Rake::Task['db:test:prepare'].invoke

  namespace :spec do
    desc 'Run specs from the host app'
    RSpec::Core::RakeTask.new(:server) do |s|
      s.pattern = ['spec/**/*_spec.rb']
    end

    desc 'Run specs from the engines'
    RSpec::Core::RakeTask.new(:engines) do |s|
      s.pattern = ['engines/**/spec/**/*_spec.rb']
    end
  end

# named :test so that roll_out will run it during a deployment
  task :test do
    # Run server and engines test separately since engine tests use combustion and server tests do not
    # Override spec_helper's 'SimpleCov.command_name' to identify coverage reports so they are merged, not overridden
    ENV['TESTING'] = 'spec:server'
    Rake::Task['spec:server'].invoke

    ENV['TESTING'] = 'spec:engines'
    Rake::Task['spec:engines'].invoke
  end

  Rake::Task[:default].clear # rspec-rails makes the default task :spec
  task default: :test
end
