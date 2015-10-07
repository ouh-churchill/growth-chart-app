Igneous::Smart::Engine.routes.draw do

  scope ':ehr_source_id', constraints: {ehr_source_id: /\S{1,36}/ } do
    resources :apps, only: [:index, :show]
  end

  resources :apps, only: [:show, :create]
  resources :fhir_servers, only: [:create]

  get 'user/preauth' => 'user#preauth'
  post 'launch/resolve' => 'launch_context#resolve', :constraints => { format: :json }
end
