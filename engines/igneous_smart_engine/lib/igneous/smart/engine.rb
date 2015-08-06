module Igneous
  module Smart
    class Engine < ::Rails::Engine
      isolate_namespace Igneous::Smart
    end
  end
end
