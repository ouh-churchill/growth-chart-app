class AddTenantToIgneousSmartLaunchContexts < ActiveRecord::Migration
  def up
    add_column :igneous_smart_launch_contexts, :tenant, :string, null: false, limit: 36, default: ''
    change_column_default :igneous_smart_launch_contexts, :tenant, nil

    add_index :igneous_smart_launch_contexts, :tenant
  end

  def down
    remove_column :igneous_smart_launch_contexts, :tenant
  end
end
