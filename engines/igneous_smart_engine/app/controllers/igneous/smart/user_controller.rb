require 'yaml'

module Igneous
  module Smart
    class UserController < ApplicationController

      OAUTH2_BASE_URL = YAML.load_file("#{Rails.root}/config/oauth.yml")[Rails.env]['oauth2_base_url']

      def preauth
        return head :bad_request if params[:context_id].blank?

        if OAUTH2_BASE_URL.blank?
          logger.warn "#{self.class.name}, No base url configured for OAuth2."
          return head :internal_server_error
        end

        context = LaunchContext.find_by context_id: params[:context_id]
        if context.nil?
          logger.warn "#{self.class.name}, Launch context_id is not found."
          return head :not_found
        end

        response.headers['SMART-Launch'] = params[:context_id]
        render locals: {
          smart_launch_url: context.smart_launch_url,
          oauth2_base_url: OAUTH2_BASE_URL
        }
      end
    end
  end
end
