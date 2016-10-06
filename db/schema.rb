# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20160914144612) do

  create_table "igneous_smart_apps", force: :cascade do |t|
    t.string   "app_id",                       limit: 36,                       null: false
    t.string   "name",                         limit: 190,                      null: false
    t.string   "launch_url",                   limit: 190,                      null: false
    t.boolean  "authorized",                               default: true,       null: false
    t.datetime "created_at",                                                    null: false
    t.datetime "updated_at",                                                    null: false
    t.integer  "igneous_smart_fhir_server_id"
    t.string   "persona",                      limit: 50,  default: "provider", null: false
  end

  add_index "igneous_smart_apps", ["app_id"], name: "index_igneous_smart_apps_on_app_id", unique: true
  add_index "igneous_smart_apps", ["launch_url"], name: "index_igneous_smart_apps_on_launch_url"
  add_index "igneous_smart_apps", ["name"], name: "index_igneous_smart_apps_on_name", unique: true

  create_table "igneous_smart_fhir_servers", force: :cascade do |t|
    t.string   "name",          limit: 190,                null: false
    t.string   "url",           limit: 190,                null: false
    t.datetime "created_at",                               null: false
    t.datetime "updated_at",                               null: false
    t.boolean  "secured",                   default: true, null: false
    t.boolean  "public_access",             default: true, null: false
  end

  add_index "igneous_smart_fhir_servers", ["name"], name: "index_igneous_smart_fhir_servers_on_name"
  add_index "igneous_smart_fhir_servers", ["url"], name: "index_igneous_smart_fhir_servers_on_url", unique: true

  create_table "igneous_smart_launch_contexts", force: :cascade do |t|
    t.string   "context_id",          limit: 40,                 null: false
    t.text     "data"
    t.datetime "created_at",                                     null: false
    t.datetime "updated_at",                                     null: false
    t.string   "app_id",              limit: 36,                 null: false
    t.text     "smart_launch_url",                               null: false
    t.string   "tenant",              limit: 36,                 null: false
    t.boolean  "need_patient_banner",            default: false, null: false
    t.string   "username",            limit: 50
  end

  add_index "igneous_smart_launch_contexts", ["app_id"], name: "index_igneous_smart_launch_contexts_on_app_id"
  add_index "igneous_smart_launch_contexts", ["context_id"], name: "index_igneous_smart_launch_contexts_on_context_id"
  add_index "igneous_smart_launch_contexts", ["created_at"], name: "index_igneous_smart_launch_contexts_on_created_at"
  add_index "igneous_smart_launch_contexts", ["tenant"], name: "index_igneous_smart_launch_contexts_on_tenant"
  add_index "igneous_smart_launch_contexts", ["username"], name: "index_igneous_smart_launch_contexts_on_username"

end
