// Global variables
var CERNER_SMART_LAUNCH = {};
CERNER_SMART_LAUNCH.oauth2BaseURL = '';
CERNER_SMART_LAUNCH.launchURL = '';
CERNER_SMART_LAUNCH.preauthTimeoutVar = null;
CERNER_SMART_LAUNCH.timeoutIntervalSec = 10; // 10 seconds
CERNER_SMART_LAUNCH.errorObj = new Error();

// Initialize XMLCclRequest
CERNER_SMART_LAUNCH.requestSync = new XMLCclRequest();

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
    }
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
    }
  }
  return '';
}

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script 350920 - PHA_GET_USER_BY_ID.
 */
function getUsernameByPersonnelId(person_id) {
  // Setup a synch request of mp_exec_std_request script
  CERNER_SMART_LAUNCH.requestSync.open('GET','mp_exec_std_request', 0);

  //Request user information with user id USR_PersonId
  CERNER_SMART_LAUNCH.requestSync.send('~MINE~,~{"REQUESTIN":{"ID_LIST": [{"PERSON_ID":' + person_id + '}]}}~,350000,350920,350920');

  if (CERNER_SMART_LAUNCH.requestSync.status === 200) {
    var parsedJSON = JSON.parse(CERNER_SMART_LAUNCH.requestSync.responseText);

    if (parsedJSON.RECORD_DATA.DATA_CNT === 1) {
      if (parsedJSON.RECORD_DATA.DATA[0].USERNAME || 0 !== parsedJSON.RECORD_DATA.DATA[0].USERNAME.length) {
        return parsedJSON.RECORD_DATA.DATA[0].USERNAME;
      }
    } else {
      Canadarm.error('Called PHA_GET_USER_BY_ID to receive username of person_id ' + person_id +
         ', received unexpected count of ' + parsedJSON.RECORD_DATA.DATA_CNT + '. Expected 1.', CERNER_SMART_LAUNCH.errorObj);
    }
  }
  return '';
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
    Canadarm.warn('OAuth2 base URL is not set.', CERNER_SMART_LAUNCH.errorObj);
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
  }

  // This invokes an API provided by the authorization server, which directs
  // the user agent to its own endpoint that can signal completion of the
  // pre-authentication workflow.
  document.getElementById('loader').src = CERNER_SMART_LAUNCH.oauth2BaseURL + '/preauth/?token=' + encodeURI(token);
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
                  ' but got: ' + event.origin, CERNER_SMART_LAUNCH.errorObj);
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
    return;
  }

  // Successfully pre-authenticated
  if (event.data === 'com.cerner.authorization:notification:preauthentication-complete') {
    Canadarm.info('Preauthentication completed. Navigating to: ' +
                   CERNER_SMART_LAUNCH.launchURL, CERNER_SMART_LAUNCH.errorObj);
  } else if (event.data.substring(0, event.data.lastIndexOf(':')) ===
            ('com.cerner.authorization:notification:preauthentication-failure:error')) {
    Canadarm.warn('Pre-authentication completed with failure: ' + event.data, CERNER_SMART_LAUNCH.errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART app.
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
                ' seconds of waiting.', CERNER_SMART_LAUNCH.errorObj);
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

  var token = getMillenniumIntegratedAuthToken();

  if (token) {
    submitToken(token);
    CERNER_SMART_LAUNCH.preauthTimeoutVar = setTimeout(preAuthFailed, CERNER_SMART_LAUNCH.timeoutIntervalSec*1000);
  } else {
    Canadarm.info('Unable to retrieve Millennium Integrated Auth Token.', CERNER_SMART_LAUNCH.errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART App.
    window.location.href = CERNER_SMART_LAUNCH.launchURL;
  }
}

/**
 * Unable to launch SMART app because tenant id or username could not be obtained.
 */
var getRequiredInfoFailed = function () {
  Canadarm.error('Unable to launch SMART app because tenant id or username could not be obtained.', CERNER_SMART_LAUNCH.errorObj);
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
  var timeoutInterval = setTimeout(getRequiredInfoFailed, CERNER_SMART_LAUNCH.timeoutIntervalSec*1000);
 
  var username = getUsernameByPersonnelId(user_person_id);
  var consumerKey = getOAuthConsumerKey();

  if (consumerKey && username) {
    clearTimeout(timeoutInterval);

    var launchURL = urlWithTenantPlaceHolder.replace(':tenant_id', consumerKey);
    window.location.href = launchURL + "&username=" + username.toLowerCase();
  } else {
    getRequiredInfoFailed();
  }
}
