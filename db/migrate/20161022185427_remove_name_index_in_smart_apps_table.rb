class RemoveNameIndexInSmartAppsTable < ActiveRecord::Migration
  def change
    remove_index :igneous_smart_apps, :name
    add_index :igneous_smart_apps, :name
  end
end
