class AddNeedPatientBannerToIgneousSmartLaunchContexts < ActiveRecord::Migration
  def up
    add_column :igneous_smart_launch_contexts, :need_patient_banner, :boolean, null: false, default: false
  end

  def down
    remove_column :igneous_smart_launch_contexts, :need_patient_banner
  end
end
