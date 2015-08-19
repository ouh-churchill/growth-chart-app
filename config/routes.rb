IgneousSmartServer::Application.routes.draw do

  root to: 'application#page_not_found'

  # health check
  mount Hi::Checkup::Engine, at: '/'

  require 'igneous/smart'
  mount Igneous::Smart::Engine, at: '/smart'

  ## The two following routes are needed to respond to http OPTIONS requests.
  # The first route matches calls to the domain, while the second route matches everything else.
  # Matching on * does not work for both scenarios (for some reason)
  match '/', via: [:options],
             to:  ->(_env) { [204, {}, []] }
  match '*unmatched', via: [:options],
                      to:  ->(_env) { [204, {}, []] }

end
