class ChangeConstraintInFhirServerTable < ActiveRecord::Migration
  def change
    remove_index :igneous_smart_fhir_servers, :name
    add_index :igneous_smart_fhir_servers, :name
  end
end
