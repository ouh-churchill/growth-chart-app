class AlterUserNameToNotNullInIgneousSmartLaunchContexts < ActiveRecord::Migration
  def change
    change_column_null :igneous_smart_launch_contexts, :username, true
  end
end