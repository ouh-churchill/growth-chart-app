Igneous::Smart::Engine.routes.draw do
  scope ':ehr_source_id' do
    resources :apps, only: [:index, :show]
  end

  resources :apps, only: [:create]
  resources :fhir_servers, only: [:create]

  post 'launch/resolve' => 'launch_context#resolve', :constraints => { format: :json }
end
