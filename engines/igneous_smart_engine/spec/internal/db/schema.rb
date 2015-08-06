ActiveRecord::Schema.define(version: 20_150_726_215_810) do

  create_table 'igneous_smart_apps', force: :cascade do |t|
    t.string 'app_id',                       limit: 36,                 null: false
    t.string 'name',                         limit: 190,                null: false
    t.string 'launch_url',                   limit: 190,                null: false
    t.boolean 'authorized',                               default: true, null: false
    t.datetime 'created_at',                                              null: false
    t.datetime 'updated_at',                                              null: false
    t.integer 'igneous_smart_fhir_server_id'
  end

  add_index 'igneous_smart_apps', ['app_id'], name: 'index_igneous_smart_apps_on_app_id', unique: true
  add_index 'igneous_smart_apps', ['launch_url'], name: 'index_igneous_smart_apps_on_launch_url'
  add_index 'igneous_smart_apps', ['name'], name: 'index_igneous_smart_apps_on_name', unique: true

  create_table 'igneous_smart_fhir_servers', force: :cascade do |t|
    t.string 'name',       limit: 190, null: false
    t.string 'url',        limit: 190, null: false
    t.datetime 'created_at',             null: false
    t.datetime 'updated_at',             null: false
  end

  add_index 'igneous_smart_fhir_servers', ['name'], name: 'index_igneous_smart_fhir_servers_on_name', unique: true
  add_index 'igneous_smart_fhir_servers', ['url'], name: 'index_igneous_smart_fhir_servers_on_url', unique: true

  create_table 'igneous_smart_launch_contexts', force: :cascade do |t|
    t.string 'context_id', limit: 40, null: false
    t.text 'data'
    t.datetime 'created_at',            null: false
    t.datetime 'updated_at',            null: false
  end

  add_index 'igneous_smart_launch_contexts', ['context_id'], name: 'index_igneous_smart_launch_contexts_on_context_id'
  add_index 'igneous_smart_launch_contexts', ['created_at'], name: 'index_igneous_smart_launch_contexts_on_created_at'

end
