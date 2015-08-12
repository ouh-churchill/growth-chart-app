require 'securerandom'

module Igneous
  module Smart
    class LaunchContext < ActiveRecord::Base
      validates_presence_of :context_id, :data
      validates_uniqueness_of :context_id

      # Public: Constructs the SMART context from the given request parameters.
      #         Save the context to the launch_context table.
      #
      # params - The request parameters Hash.
      #
      # Returns a context id associated with the given request parameters.
      def self.context(params)
        smart_context = {}

        add_context = lambda do |i, j, is_numeric = true|
          if params.key?(j) && params[j].present?
            # PowerChart currently passes in all numeric values as floats with .00 appended.
            # For instance, PAT_PersonId will have value like 123456.00
            # Until this is fixed in PowerChart (which they are working on), we need to strip this.
            # As parameters are always Strings in Rails, we'll convert to an Fixnum/Bignum (.to_i)
            # to strip the .00 and then convert back to a String (.to_s).
            value = is_numeric ? params[j].to_i.to_s : params[j]

            smart_context[i] = value
          end
        end

        # See https://wiki.ucern.com/display/public/1101discernHP/Context+Variables+Available+using+Discern+Explorer
        add_context.call('patient',         'PAT_PersonId')
        add_context.call('ppr',             'PAT_PPRCode')
        add_context.call('encounter',       'VIS_EncntrId')
        add_context.call('user',            'USR_PersonId')
        add_context.call('position',        'USR_PositionCd')
        add_context.call('device_location', 'DEV_Location', false)
        add_context.call('app_name',        'APP_AppName', false)

        create(context_id: SecureRandom.uuid, data: smart_context.to_json)
      end
    end
  end
end
