class AlterLaunchUrlToAllowNullInIgneousSmartApps < ActiveRecord::Migration
  def change
    change_column_null :igneous_smart_apps, :launch_url, true
  end
end
