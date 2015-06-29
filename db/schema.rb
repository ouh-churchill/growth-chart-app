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

ActiveRecord::Schema.define(version: 20150626212306) do

  create_table "igneous_smart_launch_contexts", force: :cascade do |t|
    t.string   "context_id", limit: 40, null: false
    t.text     "data"
    t.datetime "created_at",            null: false
    t.datetime "updated_at",            null: false
  end

  add_index "igneous_smart_launch_contexts", ["context_id", "updated_at"], name: "launch_context_index", unique: true
  add_index "igneous_smart_launch_contexts", ["context_id"], name: "index_igneous_smart_launch_contexts_on_context_id"

  create_table "sessions", force: :cascade do |t|
    t.string   "session_id", null: false
    t.text     "data"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "sessions", ["session_id"], name: "index_sessions_on_session_id", unique: true
  add_index "sessions", ["updated_at"], name: "index_sessions_on_updated_at"

end
