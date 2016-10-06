class AddPersonaToIgneousSmartApps < ActiveRecord::Migration
  def change
    add_column :igneous_smart_apps, :persona, :string, null: false, limit: 50, default: 'provider'
  end
end
