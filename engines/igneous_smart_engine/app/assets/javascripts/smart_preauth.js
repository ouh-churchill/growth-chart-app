/* globals getMillenniumIntegratedAuthToken, parseQueryParamByStr */
/* jshint latedef:nofunc */

var CernerSmartPreauth = {};
CernerSmartPreauth.oauth2BaseURL = '';
CernerSmartPreauth.launchURL = '';
CernerSmartPreauth.preauthTimeoutVar = null;
CernerSmartPreauth.timeoutIntervalSec = 20; // 20 seconds
CernerSmartPreauth.errorObj = new Error();
CernerSmartPreauth.launchId = '';

// Listen on the message and invoke receiveMessage function.
window.addEventListener('message', receiveMessage, false);

/**
 * This function will submit the identity token to the
 * OAuth2 server for pre-authentication workflow.  This
 * will enable a seamless transition to the SMART app
 * without having the user signing in again.
 */
function submitToken(encodedToken) {

  if (!CernerSmartPreauth.oauth2BaseURL) {
    // In case when the OAuth2 base URL is not
    // configured correctly, take the user to the
    // app's launch URL.  The user will be asked
    // to sign into the domain first before proceeding
    // to the SMART app.
    Canadarm.warn('OAuth2 base URL is not set. Launch Id: ' +
      CernerSmartPreauth.launchId + ' launchURL: ' + CernerSmartPreauth.launchURL, CernerSmartPreauth.errorObj);
    window.location.href = CernerSmartPreauth.launchURL;
  }

  Canadarm.info('Calling preauth endpoint with token: ' + encodedToken +
    ', Launch Id: ' + CernerSmartPreauth.launchId + ' launchURL: ' + CernerSmartPreauth.launchURL,
     CernerSmartPreauth.errorObj);
  
  // This invokes an API provided by the authorization server, which directs
  // the user agent to its own endpoint that can signal completion of the
  // pre-authentication workflow.
  document.getElementById('loader').src = CernerSmartPreauth.oauth2BaseURL + '/preauth/?token=' + encodedToken;
  return false;
}

/**
 * This function hooks and waits for the pre-authentication frame to signal completion.
 */
function receiveMessage(event) {
  // Only handle message from the expected origin domain.
  if (CernerSmartPreauth.oauth2BaseURL.indexOf(event.origin) === -1) {
    return;
  }

  // Clear the timeout
  clearTimeout(CernerSmartPreauth.preauthTimeoutVar);

  // Successfully pre-authenticated
  if (event.data === 'com.cerner.authorization:notification:preauthentication-complete') {
    Canadarm.info('Preauthentication completed. Launch Id: ' + CernerSmartPreauth.launchId +
      '. Navigating to: ' +
      CernerSmartPreauth.launchURL, CernerSmartPreauth.errorObj);
  } else if (event.data.substring(0, event.data.lastIndexOf(':')) ===
    ('com.cerner.authorization:notification:preauthentication-failure:error')) {
    Canadarm.warn('Pre-authentication completed with failure: ' + event.data +
      '. Launch Id: ' + CernerSmartPreauth.launchId + ' launchURL: ' + CernerSmartPreauth.launchURL,
       CernerSmartPreauth.errorObj);

    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART app.
  } else {
    Canadarm.warn('Pre-authentication failed because event.data is not in the expected list. ' +
      'The event.data passed in is: ' + event.data + '. Launch Id: ' +
      CernerSmartPreauth.launchId + ' launchURL: ' + CernerSmartPreauth.launchURL, CernerSmartPreauth.errorObj);
  }

  window.location.href = CernerSmartPreauth.launchURL;
}

/**
 * The user will be asked to log into the domain.
 * Upon completion, the user will be redirected to the SMART app.
 */
var preAuthFailed = function () {
  Canadarm.warn('Pre-authentication was not completed after ' + CernerSmartPreauth.timeoutIntervalSec +
    ' seconds of waiting. Launch Id: ' + CernerSmartPreauth.launchId + ' launchURL: ' + CernerSmartPreauth.launchURL,
     CernerSmartPreauth.errorObj);
  // The user would need to log into the domain.
  // After logging in, the user will be redirected to the SMART app.
  window.location.href = CernerSmartPreauth.launchURL;
};

/**
* Check the user's session before preauthenticating the user.
* If the user has an active session, proceed to load the application.
* Otherwise, preauthenticate the user and load the application.
*/
/* exported performPreauthenticationPowerChart */
function performPreauthenticationPowerChart(oauth2BaseUrl, launchUrl) {

  CernerSmartPreauth.oauth2BaseURL = oauth2BaseUrl;
  CernerSmartPreauth.launchURL = launchUrl;
  CernerSmartPreauth.launchId = parseQueryParamByStr(launchUrl, 'launch');

  // Pass in empty identity token for now.
  // Will retrieve it when needed
  checkSessionActive('');
}

/**
* Check the user's session before preauthenticating the user.
* If the user has an active session, proceed to load the application.
* Otherwise, preauthenticate the user and load the application.
*/
/* exported performPreauthentication */
function performPreauthentication(identityToken, appURL) {
  
  // Make an ajax call to appURL with the following URL format:
  // https://smart.domain.com/smart/{tenant}/apps/{app}?PAT_PersonId=123&PAT_PPRCode=123&
  // USR_PersonId=123&username=username
  Canadarm.info('Retrieving smart launch URL for appURL: ' + appURL, CernerSmartPreauth.errorObj);
  
  getURL(appURL).done(function(data) {
    if (data.smart_launch_url && data.smart_preauth_url) {
      // Store these info in the object for later use
      CernerSmartPreauth.launchURL = data.smart_launch_url;
      CernerSmartPreauth.oauth2BaseURL = data.oauth2_base_url;

      Canadarm.info('Successfully retrieved launch URL: ' + CernerSmartPreauth.launchURL +
                    ' and OAuth2 Base URL: ' + CernerSmartPreauth.oauth2BaseURL, CernerSmartPreauth.errorObj);

      // Store the launch Id from the query param
      CernerSmartPreauth.launchId = parseQueryParamByStr(data.smart_launch_url, 'launch');

      // Determine if session is active, and if yes, proceed to load the app
      // If session is inactive or something failed, use the identityToken to preauth
      checkSessionActive(identityToken);
    }
  })
  .fail(function(jqXHR, textStatus) {
    Canadarm.error('Unable to proceed due to an error: ' + jqXHR.status + ' - ' + textStatus +' retrieving ' + appURL);
  });
}

function checkSessionActive(identityToken) {
  var isInPowerChart = (window.external && typeof window.external.DiscernObjectFactory !== 'undefined');
  
  // Check to see if the user's session is active
  getSessionStatus().done(function(data) {
    if (data.activeSession === true) {
      // The user's session is active, proceed to load the SMART app.  
      Canadarm.info('The user\'s session is active. Proceed to launch the application.', CernerSmartPreauth.errorObj);
      window.location.href = CernerSmartPreauth.launchURL;
    } else {
      Canadarm.info('The user\'s session is inactive based on data response: ' + JSON.stringify(data) +
                    '. Performing preauth using identity token.', CernerSmartPreauth.errorObj);
      
      preauthWithIdentityToken(isInPowerChart ? getMillenniumIntegratedAuthToken() : identityToken);
    }
  })
  .fail(function(jqXHR, textStatus) {
    Canadarm.warn('Unable to retrieve user\'s session due to an error: ' + jqXHR.status + ' - ' + textStatus +
                  '. Performing preauth using identity token.', CernerSmartPreauth.errorObj);
    preauthWithIdentityToken(isInPowerChart ? getMillenniumIntegratedAuthToken() : identityToken);
  });
}

/**
 * Get the Millennium Integrated Auth Token.
 * When the token is obtained, call the OAuth2 preauth workflow.
 * Set a timeout based on CernerSmartPreauth.timeoutIntervalSec
 * for preauth workflow to complete. If it takes longer than the
 * specified value, the user will be asked to log in.
 * Once logged in, the user will be redirected to the SMART app.
 */
function preauthWithIdentityToken(identityToken) {
  var encodedToken = encodeURI(identityToken);
  
  if (encodedToken) {
    submitToken(encodedToken);
    CernerSmartPreauth.preauthTimeoutVar = setTimeout(preAuthFailed, CernerSmartPreauth.timeoutIntervalSec*1000);
  } else {
    // The user would need to log into the domain.
    // After logging in, the user will be redirected to the SMART App.
    window.location.href = CernerSmartPreauth.launchURL;
  }
}

/**
* @private function
* Call the Authorization server to determine whether the user's session
* is currently valid and active or not.  
* @return promise
*/
function getSessionStatus() {
  var url = CernerSmartPreauth.oauth2BaseURL + '/my-session/status';
  
  return $.get({
    headers: {
      'Accept': 'application/json; charset=utf-8'
    },
    xhrFields: {
      withCredentials: true
    },
    url: url,
    cache: false,
    timeout: 10000
  });
}

/**
* @private function
* Get JSON data from the server based on the URL provided.
* Setting the Accept header to 'application/json' so that
* the server will only send json data back.
*/
function getURL(appURL) {
  return $.get({
    headers: {
      'Accept': 'application/json; charset=utf-8'
    },
    url: appURL
  });
}
