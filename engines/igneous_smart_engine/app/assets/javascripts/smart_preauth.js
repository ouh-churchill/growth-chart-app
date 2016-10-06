/**
 * Created by ss025783 on 9/6/16.
 */

// Listen on the message and invoke receiveMessage function.
window.addEventListener('message', receiveMessage, false);

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
  // Only handle message from the expected origin domain.
  if (CERNER_SMART_LAUNCH.oauth2BaseURL.indexOf(event.origin) === -1) {
    return;
  }

  // Clear the timeout
  clearTimeout(CERNER_SMART_LAUNCH.preauthTimeoutVar);

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
