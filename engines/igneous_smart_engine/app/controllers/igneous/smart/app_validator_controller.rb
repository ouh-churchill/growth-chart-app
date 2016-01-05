require 'igneous/smart'

module Igneous
  module Smart
    class AppValidatorController < Igneous::Smart::ApplicationController

      skip_before_action :ensure_request_is_from_cerner_network

      def results

        if params['failureCount'].to_i > 0

          logger.info "#{self.class.name}, SMART App Validator FAILURE: #{params['failureCount']} out " \
                      "of #{params['resourceCount']} resources failed, SMART App validator results: #{params}"
          head :no_content
          return
        end

        logger.info "#{self.class.name}, SMART App Validator SUCCESS: All of the #{params['resourceCount']} " \
                    "resources succeeded, SMART App validator results: #{params}"
        head :no_content
      end

    end
  end
end
