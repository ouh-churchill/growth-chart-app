module Igneous
  module Smart
    class FhirServer < ActiveRecord::Base
      validates_presence_of :name, :url

      has_many :apps
    end
  end
end
