# This migration comes from igneous_smart (originally 20150616204833)
class CreateIgneousSmartLaunchContexts < ActiveRecord::Migration
  def change
    create_table :igneous_smart_launch_contexts do |t|
      t.string :context_id, index: true, null: false, limit: 40
      t.text :data
      t.timestamps null: false

      t.index [:context_id, :updated_at], unique: true, name: 'launch_context_index'
    end
  end
end
