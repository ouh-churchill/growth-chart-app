class AddAppIdSmartLaunchUrlToIgneousSmartLaunchContexts < ActiveRecord::Migration
  def up
    add_column :igneous_smart_launch_contexts, :app_id, :string, null: false, limit: 36, default: ''
    change_column_default :igneous_smart_launch_contexts, :app_id, nil

    add_column :igneous_smart_launch_contexts, :smart_launch_url, :text
    Igneous::Smart::LaunchContext.reset_column_information
    Igneous::Smart::LaunchContext.all.each do |c|
      c.update_attribute :smart_launch_url, ''
    end
    change_column :igneous_smart_launch_contexts, :smart_launch_url, :text, null: false

    add_index :igneous_smart_launch_contexts, :app_id
  end

  def down
    remove_column :igneous_smart_launch_contexts, :app_id
    remove_column :igneous_smart_launch_contexts, :smart_launch_url
  end
end
