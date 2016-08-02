class AddSecuredPublicAccessToIgneousSmartFhirServers < ActiveRecord::Migration
  def up
    add_column :igneous_smart_fhir_servers, :secured, :boolean, null: false, default: true
    add_column :igneous_smart_fhir_servers, :public_access, :boolean, null: false, default: true
  end

  def down
    remove_column :igneous_smart_fhir_servers, :secured
    remove_column :igneous_smart_fhir_servers, :public_access
  end
end
