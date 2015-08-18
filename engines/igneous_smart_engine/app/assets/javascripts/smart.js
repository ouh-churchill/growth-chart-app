// Global variables
var oauth2BaseURL = '';
var launchURL = '';
var errorObj = new Error();

// Initialize XMLCclRequest
var requestSync = new XMLCclRequest();

/**
 * Use XMLCclRequest to execute mp_exec_std_request having the target
 * script/EJS as 99999124 - GenerateSingleUseIdentityToken.  This function
 * will return an identity token if the request was successful.  It will
 * return an empty string when the request failed.
 */
function getMillenniumIntegratedAuthToken() {
  // Setup a synch request of mp_exec_std_request script
  requestSync.open('GET','mp_exec_std_request', 0);

  // Populating the request info with request structure and ATR
  // for the request that we want to execute:
  // 99999124 - GenerateSingleUseIdentityToken
  requestSync.send('~MINE~,~{"REQUESTIN":{}}~,3202004,3202004,99999124');

  if (requestSync.status === 200) {
    var parsedJSON = JSON.parse(requestSync.responseText);

    if (parsedJSON.RECORD_DATA.STATUS.SUCCESS_IND === 1) {
      return parsedJSON.RECORD_DATA.IDENTITY_TOKEN.valueOf();
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

  if (!oauth2BaseURL) {
    // In case when the OAuth2 base URL is not
    // configured correctly, take the user to the
    // app's launch URL.  The user will be asked
    // to sign into the domain first before proceeding
    // to the SMART app.
    Canadarm.warn('OAuth2 base URL is not set.', errorObj);
    window.location.href = launchURL;
  }

  // This invokes an API provided by the authorization server, which directs
  // the user agent to its own endpoint that can signal completion of the
  // pre-authentication workflow.
  document.getElementById('loader').src = oauth2BaseURL + '/preauth/?token=' + encodeURI(token);
  return false;
}

/**
 * This function hooks and waits for the pre-authentication frame to signal completion.
 */
function receiveMessage(event) {

  // Only handle message from the expected origin domain.
  if (oauth2BaseURL.indexOf(event.origin) === -1) {
    return;
  }

  // Successfully pre-authenticated
  if (event.data === 'com.cerner.authorization:notification:preauthentication-complete') {
    window.location.href = launchURL;
  } else if (event.data.substring(0, event.data.lastIndexOf(':')) ===
            ('com.cerner.authorization:notification:preauthentication-failure:error')) {
    Canadarm.warn('Pre-authentication completed with failure: ' + event.data, errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART app.
    window.location.href = launchURL;
  }
}

// Listen on the message and invoke receiveMessage function.
window.addEventListener('message', receiveMessage, false);

/**
 * The user will be asked to log into the domain.
 * Upon completion, the user will be redirected to the SMART app.
 */
var preAuthFailed = function () {
  Canadarm.warn('Pre-authentication was not completed after 5 seconds of waiting.', errorObj);
  // The user would need to log into the domain.
  // After logging in, the user will be redirected to the SMART app.
  window.location.href = launchURL;
};

/**
 * Get the Millennium Integrated Auth Token.
 * When the token is obtained, call the OAuth2 preauth workflow.
 * Set a timeout of 5 seconds for preauth workflow to complete.
 * If it takes longer than 5 seconds, the user will be asked to log in.
 * Once logged in, the user will be redirected to the SMART app.
 */
/*jshint unused:false*/
function performPreauthentication(oauth2BaseUrl, launchUrl) {
  oauth2BaseURL = oauth2BaseUrl;
  launchURL = launchUrl;

  var token = getMillenniumIntegratedAuthToken();

  if (token) {
    submitToken(token);
    setTimeout(preAuthFailed, 5000); // 5 Second timeout
  } else {
    Canadarm.info('Unable to retrieve Millennium Integrated Auth Token.', errorObj);
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART App.
    window.location.href = launchURL;
  }
}
