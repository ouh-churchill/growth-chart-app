class AlterUserNameRemoveIndexInIgneousSmartLaunchContexts < ActiveRecord::Migration
  def change
    remove_index :igneous_smart_launch_contexts, :username
  end
end
