# This migration comes from igneous_smart (originally 20150725235027)
class CreateIgneousSmartApps < ActiveRecord::Migration
  def change
    create_table :igneous_smart_apps do |t|
      t.string :app_id, index: {unique: true}, null: false, limit: 36
      t.string :name, index: {unique: true}, null: false, limit: 190
      t.string :launch_url, index:true, null: false, limit: 190
      t.boolean :authorized, default: true, null: false
      t.timestamps null: false
    end

    add_reference :igneous_smart_apps, :igneous_smart_fhir_server, foreign_key: true
  end
end
