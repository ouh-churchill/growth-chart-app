require 'rails_helper'
require_relative '../../../config/environments/production'

describe Rails.application.config do
  let(:config) { Rails.application.config }

  it 'ensures that production log is output to /var/log/igneous-smart_server/production.log' do
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
    expect(config.paths['log'].first).to eq('/var/log/igneous-smart_server/production.log')
  end
end

