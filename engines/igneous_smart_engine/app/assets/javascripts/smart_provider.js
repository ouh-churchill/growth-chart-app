/**
 * Created by ss025783 on 9/6/16.
 */

/* globals CernerSmartLaunch, validateDataAndReportErrors, getRequiredInfoFailed */
/* jshint latedef:nofunc */

/**
 * Determines whether the code is executing in PowerChart context or
 * in a stand alone browser.
 */
function isRunningInPowerChart() {
  return (window.external && typeof window.external.DiscernObjectFactory !== 'undefined');
}
/* exported retrieveProviderInfoAndRedirect */
function retrieveProviderInfoAndRedirect(urlWithTenantPlaceHolder, user_person_id) {
  if (isRunningInPowerChart()) {
    var timeoutInterval = setTimeout(getRequiredInfoFailed, CernerSmartLaunch.timeoutIntervalSec*1000);

    var username = getUsernameByPersonnelId(user_person_id);
    var consumerKey = getOAuthConsumerKey();

    if (consumerKey && username) {
      clearTimeout(timeoutInterval);

      var launchURL = urlWithTenantPlaceHolder.replace(':tenant_id', consumerKey);
      window.location.href = launchURL + '&username=' + username;
    } else {
      clearTimeout(timeoutInterval);

      if (!username) {
        Canadarm.error('Unable to launch SMART app because username could not be obtained.',
          CernerSmartLaunch.errorObj);
      }

      if (!consumerKey) {
        Canadarm.error('Unable to launch SMART app because tenant id could not be obtained.',
          CernerSmartLaunch.errorObj);
      }
    }
  } else {
    validateDataAndReportErrors(urlWithTenantPlaceHolder);
  }
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script/EJS as 99999115 - StartOAuthSession.User.  This function
 * will return an OAuth consumer key if the request was successful.  It will
 * return an empty string when the request failed.
 */
function getOAuthConsumerKey() {
  // Setup a synch request of mp_exec_std_request script
  CernerSmartLaunch.requestSync.open('GET','mp_exec_std_request', 0);

  // Populating the request info with request structure and ATR
  // for the request that we want to execute:
  // 99999115 - StartOAuthSession.User
  CernerSmartLaunch.requestSync.send('~MINE~,~{"REQUESTIN":{}}~,3202004,3202004,99999115');

  if (CernerSmartLaunch.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CernerSmartLaunch.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.STATUS.SUCCESS_IND === 1) {
      return parsedJSON.RECORD_DATA.OAUTH_RESPONSE.OAUTH_CONSUMER_KEY.valueOf();
    } else {
      Canadarm.error('The response of StartOAuthSession.User (99999115) returned a failure ' +
        'with the following error_code: ' + parsedJSON.RECORD_DATA.STATUS.ERROR_CODE +
        '.', CernerSmartLaunch.errorObj);
    }
  } else {
    Canadarm.error('Called StartOAuthSession.User (99999115) to retrieve OAuth consumer key' +
      ', but failed due to the response status is not 200. The response status is: ' +
      CernerSmartLaunch.requestSync.status + '.', CernerSmartLaunch.errorObj);
  }
  return '';
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script/EJS as 99999124 - GenerateSingleUseIdentityToken.  This function
 * will return an identity token if the request was successful.  It will
 * return an empty string when the request failed.
 */
/* exported getMillenniumIntegratedAuthToken */
function getMillenniumIntegratedAuthToken() {

  // Setup a synch request of mp_exec_std_request script
  CernerSmartLaunch.requestSync.open('GET','mp_exec_std_request', 0);

  // Populating the request info with request structure and ATR
  // for the request that we want to execute:
  // 99999124 - GenerateSingleUseIdentityToken
  CernerSmartLaunch.requestSync.send('~MINE~,~{"REQUESTIN":{}}~,3202004,3202004,99999124');

  if (CernerSmartLaunch.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CernerSmartLaunch.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.STATUS.SUCCESS_IND === 1) {
      return parsedJSON.RECORD_DATA.IDENTITY_TOKEN.valueOf();
    } else {
      Canadarm.error('The response of GenerateSingleUseIdentityToken (99999124) returned a failure ' +
        'with the following error_code: ' + parsedJSON.RECORD_DATA.STATUS.ERROR_CODE +
        '.', CernerSmartLaunch.errorObj);
    }
  } else {
    Canadarm.error('Called GenerateSingleUseIdentityToken (99999124) to retrieve integrated auth token' +
      ', but failed due to the response status is not 200. The response status is: ' +
      CernerSmartLaunch.requestSync.status + '.', CernerSmartLaunch.errorObj);
  }
  return '';
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script 115458 - pm_get_prsnl_by_entity_id_wrap.
 */
function getUsernameByPersonnelId(personnel_id) {
  // Setup a synch request of mp_exec_std_request script
  CernerSmartLaunch.requestSync.open('GET','mp_exec_std_request', 0);
  CernerSmartLaunch.requestSync.send('~MINE~,~{"REQUESTIN":' +
    '{"load": {"prsnl_ind": 1},' +
    '"entity_qual": [{"entity_id":' + personnel_id + '.00' +
    ', "entity_name": "PRSNL"}]' +
    '}' +
    '}~,3202004,3202004,115458');

  if (CernerSmartLaunch.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CernerSmartLaunch.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.ENTITY_QUAL_CNT === 1) {

      if (parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME ||
        0 !== parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME.length) {
        return (parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME).toLowerCase();
      } else {
        Canadarm.error('The response of pm_get_prsnl_by_entity_id_wrap returned 1 result.' +
          ' However, the username of personnel_id ' + personnel_id +
          ' is blank or empty.', CernerSmartLaunch.errorObj);
      }
    } else {
      Canadarm.error('The response of pm_get_prsnl_by_entity_id_wrap to retrieve username' +
        ' of personnel_id ' + personnel_id +
        ', returned unexpected count of ' + parsedJSON.RECORD_DATA.ENTITY_QUAL_CNT +
        '. Expected 1.', CernerSmartLaunch.errorObj);
    }
  } else {
    Canadarm.error('Called pm_get_prsnl_by_entity_id_wrap to retrieve username of personnel_id ' + personnel_id +
      ', but failed due to the response status is not 200. The response status is: ' +
      CernerSmartLaunch.requestSync.status + '.', CernerSmartLaunch.errorObj);
  }

  return '';
}
