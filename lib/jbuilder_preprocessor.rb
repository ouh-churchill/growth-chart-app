require 'roll_out'
require 'flatten_jbuilder'

# A module that extends RollOut by adding a flatten_jbuilder step that executes before executing tests.
module JbuilderPreprocessor
  # a before_execute_tests hook is used to inject the Jbuilder flattening step.
  RollOut::Test::Execution.before_execute_tests do
    Dir.glob('engines/*') do |engine|
      Dir.chdir(engine) do
        # Finds all Jbuilder files that are not partials in this engine and flattens their structure.
        FlattenJbuilder.execute(:all)
      end
    end
  end
end
