class AddServerTypeToFhirServerTable < ActiveRecord::Migration
  def change
    add_column :igneous_smart_fhir_servers, :server_type, :string, null: false, limit: 50, default: 'provider'
    remove_index :igneous_smart_fhir_servers, :url
    add_index :igneous_smart_fhir_servers, :url
  end
end
