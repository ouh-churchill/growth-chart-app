module Igneous
  module Smart
    class FhirServer < ActiveRecord::Base
      validates_presence_of :name, :url
      validates_uniqueness_of :name

      has_many :apps
    end
  end
end
