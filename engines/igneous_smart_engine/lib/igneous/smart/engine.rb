module Igneous
  module Smart
    class Engine < ::Rails::Engine
      isolate_namespace Igneous::Smart

      initializer 'igneous-smart_engine.assets' do |app|
        path = File.join(Igneous::Smart::Engine.root, 'app/assets/**/*')
        vendor_path = File.join(Igneous::Smart::Engine.root, 'vendor/assets/**/*')

        app.config.assets.paths << path
        app.config.assets.paths << vendor_path
        app.config.assets.precompile += Dir.glob(path).select { |f| File.file?(f) }
        app.config.assets.precompile += Dir.glob(vendor_path).select { |f| File.file?(f) }
      end

    end
  end
end
