// Global variables
var CERNER_SMART_LAUNCH = {};
CERNER_SMART_LAUNCH.oauth2BaseURL = '';
CERNER_SMART_LAUNCH.launchURL = '';
CERNER_SMART_LAUNCH.preauthTimeoutVar = null;
CERNER_SMART_LAUNCH.timeoutIntervalSec = 10; // 10 seconds
CERNER_SMART_LAUNCH.errorObj = new Error();
CERNER_SMART_LAUNCH.launchId = '';

// Initialize XMLCclRequest
CERNER_SMART_LAUNCH.requestSync = new XMLCclRequest();

/**
* Determines whether the code is executing in PowerChart context or
* in a stand alone browser.
*/
function isRunningInPowerChart() {

  return (window.external && typeof window.external.DiscernObjectFactory !== 'undefined');

}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script/EJS as 99999115 - StartOAuthSession.User.  This function
 * will return an OAuth consumer key if the request was successful.  It will
 * return an empty string when the request failed.
 */
function getOAuthConsumerKey() {
  // Setup a synch request of mp_exec_std_request script
  CERNER_SMART_LAUNCH.requestSync.open('GET','mp_exec_std_request', 0);

  // Populating the request info with request structure and ATR
  // for the request that we want to execute:
  // 99999115 - StartOAuthSession.User
  CERNER_SMART_LAUNCH.requestSync.send('~MINE~,~{"REQUESTIN":{}}~,3202004,3202004,99999115');

  if (CERNER_SMART_LAUNCH.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CERNER_SMART_LAUNCH.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.STATUS.SUCCESS_IND === 1) {
      return parsedJSON.RECORD_DATA.OAUTH_RESPONSE.OAUTH_CONSUMER_KEY.valueOf();
    } else {
      Canadarm.error('The response of StartOAuthSession.User (99999115) returned a failure ' +
         'with the following error_code: ' + parsedJSON.RECORD_DATA.STATUS.ERROR_CODE +
         '.', CERNER_SMART_LAUNCH.errorObj);
    }
  } else {
    Canadarm.error('Called StartOAuthSession.User (99999115) to retrieve OAuth consumer key' +
         ', but failed due to the response status is not 200. The response status is: ' +
         CERNER_SMART_LAUNCH.requestSync.status + '.', CERNER_SMART_LAUNCH.errorObj);
  }
  return '';
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script/EJS as 99999124 - GenerateSingleUseIdentityToken.  This function
 * will return an identity token if the request was successful.  It will
 * return an empty string when the request failed.
 */
function getMillenniumIntegratedAuthToken() {
  // Setup a synch request of mp_exec_std_request script
  CERNER_SMART_LAUNCH.requestSync.open('GET','mp_exec_std_request', 0);

  // Populating the request info with request structure and ATR
  // for the request that we want to execute:
  // 99999124 - GenerateSingleUseIdentityToken
  CERNER_SMART_LAUNCH.requestSync.send('~MINE~,~{"REQUESTIN":{}}~,3202004,3202004,99999124');

  if (CERNER_SMART_LAUNCH.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CERNER_SMART_LAUNCH.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.STATUS.SUCCESS_IND === 1) {
      return parsedJSON.RECORD_DATA.IDENTITY_TOKEN.valueOf();
    } else {
      Canadarm.error('The response of GenerateSingleUseIdentityToken (99999124) returned a failure ' +
         'with the following error_code: ' + parsedJSON.RECORD_DATA.STATUS.ERROR_CODE +
         '.', CERNER_SMART_LAUNCH.errorObj);
    }
  } else {
    Canadarm.error('Called GenerateSingleUseIdentityToken (99999124) to retrieve integrated auth token' +
         ', but failed due to the response status is not 200. The response status is: ' +
         CERNER_SMART_LAUNCH.requestSync.status + '.', CERNER_SMART_LAUNCH.errorObj);
  }
  return '';
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script 115458 - pm_get_prsnl_by_entity_id_wrap.
 */
function getUsernameByPersonnelId(personnel_id) {
  // Setup a synch request of mp_exec_std_request script
  CERNER_SMART_LAUNCH.requestSync.open('GET','mp_exec_std_request', 0);
  CERNER_SMART_LAUNCH.requestSync.send('~MINE~,~{"REQUESTIN":' +
                                                  '{"load": {"prsnl_ind": 1},' +
                                                  '"entity_qual": [{"entity_id":' + personnel_id + '.00' +
                                                  ', "entity_name": "PRSNL"}]' +
                                                  '}' +
                                               '}~,3202004,3202004,115458');

  if (CERNER_SMART_LAUNCH.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CERNER_SMART_LAUNCH.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.ENTITY_QUAL_CNT === 1) {

      if (parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME ||
          0 !== parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME.length) {
        return (parsedJSON.RECORD_DATA.ENTITY_QUAL[0].PRSNL.USERNAME).toLowerCase();
      } else {
        Canadarm.error('The response of pm_get_prsnl_by_entity_id_wrap returned 1 result.' +
          ' However, the username of personnel_id ' + personnel_id +
          ' is blank or empty.', CERNER_SMART_LAUNCH.errorObj);
      }
    } else {
      Canadarm.error('The response of pm_get_prsnl_by_entity_id_wrap to retrieve username' +
        ' of personnel_id ' + personnel_id +
         ', returned unexpected count of ' + parsedJSON.RECORD_DATA.ENTITY_QUAL_CNT +
         '. Expected 1.', CERNER_SMART_LAUNCH.errorObj);
    }
  } else {
    Canadarm.error('Called pm_get_prsnl_by_entity_id_wrap to retrieve username of personnel_id ' + personnel_id +
         ', but failed due to the response status is not 200. The response status is: ' +
         CERNER_SMART_LAUNCH.requestSync.status + '.', CERNER_SMART_LAUNCH.errorObj);
  }

  return '';
}

/**
* Get the value of paramStr in query parameter based on the urlStr.
* urlStr - the URL with query param
* paramStr - the value of the parameter to search
* 
* return value for paramStr or empty string if paramStr not found.
*/
function parseQueryParamByStr(urlStr, paramStr) {
  var urlStrLowerCase = urlStr.toLowerCase();
  var indexOfParamStr = urlStrLowerCase.indexOf(paramStr);
  
  if (indexOfParamStr === -1) {
    return '';
  }
  
  var beginParam = urlStrLowerCase.substring(indexOfParamStr, urlStrLowerCase.length);
  var keyValuePairArr = beginParam.split('&');
  var keyValueArr = [];
  for (var i = 0; i < keyValuePairArr.length; i++) {
    var tempKeyValArr = keyValuePairArr[i].split('=');
    if (tempKeyValArr[0] && tempKeyValArr[1]) {
      keyValueArr[tempKeyValArr[0].valueOf()] = tempKeyValArr[1].valueOf();
    }
  }

  return keyValueArr[paramStr];
}

/**
 * This function will submit the identity token to the
 * OAuth2 server for pre-authentication workflow.  This
 * will enable a seamless transition to the SMART app
 * without having the user signing in again.
 */
function submitToken(token) {
  
  if (!CERNER_SMART_LAUNCH.oauth2BaseURL) {
    // In case when the OAuth2 base URL is not
    // configured correctly, take the user to the
    // app's launch URL.  The user will be asked
    // to sign into the domain first before proceeding
    // to the SMART app.
    Canadarm.warn('OAuth2 base URL is not set. Launch Id: ' +
                  CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
  }

  // This invokes an API provided by the authorization server, which directs
  // the user agent to its own endpoint that can signal completion of the
  // pre-authentication workflow.
  var encodedToken = encodeURI(token);
  Canadarm.info('Calling preauth endpoint with token: ' + encodedToken +
                ' and Launch Id: ' + CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
  document.getElementById('loader').src = CERNER_SMART_LAUNCH.oauth2BaseURL + '/preauth/?token=' + encodedToken;
  return false;
}

/**
 * This function hooks and waits for the pre-authentication frame to signal completion.
 */
function receiveMessage(event) {
  // Clear the timeout
  clearTimeout(CERNER_SMART_LAUNCH.preauthTimeoutVar);
  
  // Only handle message from the expected origin domain.
  if (CERNER_SMART_LAUNCH.oauth2BaseURL.indexOf(event.origin) === -1) {
    Canadarm.warn('The OAuth2 base URLs do not match. Expected: ' + CERNER_SMART_LAUNCH.oauth2BaseURL +
                  ' but got: ' + event.origin + ' Launch Id: ' +
                  CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
    return;
  }

  // Successfully pre-authenticated
  if (event.data === 'com.cerner.authorization:notification:preauthentication-complete') {
    Canadarm.info('Preauthentication completed. Launch Id: ' + CERNER_SMART_LAUNCH.launchId +
                  '. Navigating to: ' +
                  CERNER_SMART_LAUNCH.launchURL, CERNER_SMART_LAUNCH.errorObj);
  } else if (event.data.substring(0, event.data.lastIndexOf(':')) ===
            ('com.cerner.authorization:notification:preauthentication-failure:error')) {
    Canadarm.warn('Pre-authentication completed with failure: ' + event.data +
                  '. Launch Id: ' + CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART app.
  } else {
    Canadarm.warn('Pre-authentication failed because event.data is not in the expected list. ' +
                  'The event.data passed in is: ' + event.data + '. Launch Id: ' +
                  CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
  }

  window.location.href = CERNER_SMART_LAUNCH.launchURL;
}

// Listen on the message and invoke receiveMessage function.
window.addEventListener('message', receiveMessage, false);

/**
 * The user will be asked to log into the domain.
 * Upon completion, the user will be redirected to the SMART app.
 */
var preAuthFailed = function () {
  Canadarm.warn('Pre-authentication was not completed after ' + CERNER_SMART_LAUNCH.timeoutIntervalSec +
                ' seconds of waiting. Launch Id: ' + CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
  // The user would need to log into the domain.
  // After logging in, the user will be redirected to the SMART app.
  window.location.href = CERNER_SMART_LAUNCH.launchURL;
};

/**
 * Get the Millennium Integrated Auth Token.
 * When the token is obtained, call the OAuth2 preauth workflow.
 * Set a timeout based on CERNER_SMART_LAUNCH.timeoutIntervalSec
 * for preauth workflow to complete. If it takes longer than the
 * specified value, the user will be asked to log in.
 * Once logged in, the user will be redirected to the SMART app.
 */
/*jshint unused:false*/
function performPreauthentication(oauth2BaseUrl, launchUrl) {

  CERNER_SMART_LAUNCH.oauth2BaseURL = oauth2BaseUrl;
  CERNER_SMART_LAUNCH.launchURL = launchUrl;
  CERNER_SMART_LAUNCH.launchId = parseQueryParamByStr(launchUrl, 'launch');

  // If this page is not executing in PowerChart,
  // redirect the user to the login page.

  if (!isRunningInPowerChart()) {
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
    Canadarm.info('The application is being launched outside of PowerChart. ' +
                  'No preauth needed. Launch Id: ' + CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
    return;
  }

  var token = getMillenniumIntegratedAuthToken();

  if (token) {
    submitToken(token);
    CERNER_SMART_LAUNCH.preauthTimeoutVar = setTimeout(preAuthFailed, CERNER_SMART_LAUNCH.timeoutIntervalSec*1000);
  } else {
    Canadarm.warn('Unable to retrieve Millennium Integrated Auth Token. Launch Id: ' +
                  CERNER_SMART_LAUNCH.launchId, CERNER_SMART_LAUNCH.errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART App.
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
  }
}

/**
 * Unable to launch SMART app because tenant id or username could not be obtained.
 */
var getRequiredInfoFailed = function () {
  Canadarm.error('Unable to launch SMART app because tenant id ' +
                 'or username could not be obtained.', CERNER_SMART_LAUNCH.errorObj);
};

/**
* Retrieve tenant id with getOAuthConsumerKey() call.
* The tenant id is equivalent to oauth consumer key.
* Retrieve username with getUsernameByPersonnelId
* The user_person_id is the USR_PersonId from the query string.
* Once that is done, we redirect the user to this
* new URL.
*/
/*jshint unused:false*/
function retrieveRequiredInfoAndRedirect(urlWithTenantPlaceHolder, user_person_id) {
  
  if (isRunningInPowerChart()) {
    var timeoutInterval = setTimeout(getRequiredInfoFailed, CERNER_SMART_LAUNCH.timeoutIntervalSec*1000);

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
                       CERNER_SMART_LAUNCH.errorObj);
      }

      if (!consumerKey) {
        Canadarm.error('Unable to launch SMART app because tenant id could not be obtained.',
                       CERNER_SMART_LAUNCH.errorObj);
      }
    }
  } else {
    var missingTenantId = '';
    var missingUsername = '';

    if (urlWithTenantPlaceHolder.indexOf(':tenant_id') !== -1) {
      missingTenantId = 'The tenant ID is required to launch the app.';
      Canadarm.error(missingTenantId, CERNER_SMART_LAUNCH.errorObj);
      missingTenantId += '<br>';
    }
    
    var usernameParamVal = parseQueryParamByStr(urlWithTenantPlaceHolder, 'username');
    if (!usernameParamVal) {
      missingUsername = 'The username query parameter is required to launch the app.';
      Canadarm.error(missingUsername, CERNER_SMART_LAUNCH.errorObj);
      missingUsername += '<br>';
    }

    document.getElementById('error-message').innerHTML = '<p>' + missingTenantId + missingUsername + '</p>';
  }
}
