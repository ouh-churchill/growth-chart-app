
module Igneous
  module Smart
    class ApplicationController < ActionController::Base
      # Prevent CSRF attacks by using the default :null_session.
      protect_from_forgery
    end
  end
end
