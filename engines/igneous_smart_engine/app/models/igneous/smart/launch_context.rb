require 'securerandom'

module Igneous
  module Smart
    class LaunchContext < ActiveRecord::Base
      validates_presence_of :context_id, :data, :app_id, :smart_launch_url
      validates_uniqueness_of :context_id

      after_initialize do
        self.context_id ||= SecureRandom.uuid if self.new_record?
      end

      # Public: Constructs the SMART context from the given request parameters.
      #         Save the context to the launch_context table.
      #
      # params - The app parameters Hash.
      # app_id - The ID of the SMART app being launched.
      # smart_launch_url - The launch URL of the SMART app.
      #
      # Returns a context object associated with the given request parameters.
      def context(params, app_id, smart_launch_url)
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
        add_context.call('patient',         'pat_personid')
        add_context.call('ppr',             'pat_pprcode')
        add_context.call('encounter',       'vis_encntrid')
        add_context.call('user',            'usr_personid')
        add_context.call('position',        'usr_positioncd')
        add_context.call('device_location', 'dev_location', false)
        add_context.call('container_name',  'app_appname', false)

        banner = (params['need_patient_banner']) ? params['need_patient_banner'] : false
        LaunchContext.create(context_id: self.context_id,
                             data: smart_context.to_json,
                             app_id: app_id,
                             smart_launch_url: smart_launch_url,
                             tenant: params['ehr_source_id'],
                             need_patient_banner: banner)
      end
    end
  end
end
