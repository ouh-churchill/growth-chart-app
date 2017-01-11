class RemoveIndexFromSmartAppsTable < ActiveRecord::Migration
  def change
    remove_index :igneous_smart_apps, :name
  end
end
