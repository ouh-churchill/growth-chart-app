require 'yaml'

module Igneous
  module Smart
    class UserController < Igneous::Smart::ApplicationController

      skip_before_action :ensure_request_is_from_cerner_network

      def preauth
        return head :bad_request if params[:context_id].blank?

        if OAUTH2_BASE_URL.blank?
          logger.warn "#{self.class.name}, No base url configured for OAuth2."
          return head :internal_server_error
        end

        context = LaunchContext.find_by context_id: params[:context_id]
        if context.nil?
          logger.info "#{self.class.name}, Launch context_id is not found."
          return head :not_found
        end

        response.headers['SMART-Launch'] = params[:context_id]

        render locals: {
          smart_launch_url: context.smart_launch_url,
          oauth2_base_url: OAUTH2_BASE_URL
        }
      end

      def preauth_url
        if OAUTH2_BASE_URL.blank?
          logger.warn "#{self.class.name}, No base url configured for OAuth2."
          return head :internal_server_error
        end

        respond_to do |format|
          format.json {
            render json: {
              oauth2_preauth_url: "#{OAUTH2_BASE_URL}/preauth/?token="
            }, status: :ok
          }
          format.html {
            head 406
          }
        end
      end

    end
  end
end
