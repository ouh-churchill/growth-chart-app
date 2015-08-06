# This migration comes from igneous_smart (originally 20150715140831)
class ChangeIndexForIgneousSmartLaunchContexts < ActiveRecord::Migration
  def change
    remove_index :igneous_smart_launch_contexts, name: :launch_context_index
    add_index :igneous_smart_launch_contexts, :created_at
  end
end
