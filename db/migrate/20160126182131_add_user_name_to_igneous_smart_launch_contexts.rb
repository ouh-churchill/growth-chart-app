class AddUserNameToIgneousSmartLaunchContexts < ActiveRecord::Migration
  def up
  	add_column :igneous_smart_launch_contexts, :username, :string, null: false, limit: 50, default: ''
    change_column_default :igneous_smart_launch_contexts, :username, nil

    add_index :igneous_smart_launch_contexts, :username
  end

  def down
  	remove_column :igneous_smart_launch_contexts, :username
  end
end