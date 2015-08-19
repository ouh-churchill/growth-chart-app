class ApplicationController < ActionController::Base
  protect_from_forgery

  def page_not_found
    head :not_found
  end
end
