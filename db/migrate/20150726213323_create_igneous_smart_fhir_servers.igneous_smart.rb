# This migration comes from igneous_smart (originally 20150725235026)
class CreateIgneousSmartFhirServers < ActiveRecord::Migration
  def change
    create_table :igneous_smart_fhir_servers do |t|
      t.string :name, index: {unique: true}, null: false, limit: 190
      t.string :url, index: {unique: true}, null: false, limit: 190
      t.timestamps null: false
    end
  end
end
