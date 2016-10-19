class AlterUserNameConstraintsInIgneousSmartLaunchContexts < ActiveRecord::Migration
  def change
    change_column :igneous_smart_launch_contexts, :username, :text, :null => false, :limit => nil
  end
end
