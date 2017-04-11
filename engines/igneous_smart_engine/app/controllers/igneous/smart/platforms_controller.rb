require 'igneous/smart'

module Igneous
  module Smart
    class PlatformsController < Igneous::Smart::ApplicationController

      skip_before_action :ensure_request_is_from_cerner_network

      # Non-embedded preauth route for other platforms to do single-sign-on (sso)
      # and redirect to the SMART application.
      # Required params:
      # identityToken - for sso
      # appURL - for retrieving smart launch url and redirect to the application
      # tenant - for tracking and logging out app launches at tenant
      def preauth
        token = params[:identityToken].present? ? params[:identityToken] : params[:identitytoken]
        url = params[:appURL].present? ? params[:appURL] : params[:appurl]
        tenant = params[:tenant]

        if token.blank? || url.blank? || tenant.blank?
          logger.info 'The identityToken, appURL, or tenant is blank.  These are required.'
          return render status: :bad_request, text: 'The identityToken, appURL, or tenant is blank.\
                                                      These are required.'
        end

        render locals: {
          identity_token: token,
          app_url: url
        }
      end
    end
  end
end
