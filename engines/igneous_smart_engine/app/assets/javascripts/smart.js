/* globals retrieveRequiredInfoAndRedirect, retrieveProviderInfoAndRedirect, parseQueryParamByStr */
// Global variables
var CernerSmartLaunch = {};
CernerSmartLaunch.timeoutIntervalSec = 20; // 20 seconds
CernerSmartLaunch.errorObj = new Error();

// Initialize XMLCclRequest
CernerSmartLaunch.requestSync = new XMLCclRequest();

function validateDataAndReportErrors(urlWithTenantPlaceHolder) {

  var missingTenantId = '';
  var missingUsername = '';

  if (urlWithTenantPlaceHolder.indexOf(':tenant_id') !== -1) {
    missingTenantId = 'The tenant ID is required to launch the app.';
    Canadarm.error(missingTenantId, CernerSmartLaunch.errorObj);
    missingTenantId += '<br>';
  }

  var usernameParamVal = parseQueryParamByStr(urlWithTenantPlaceHolder, 'username');
  if (!usernameParamVal) {
    missingUsername = 'The username query parameter is required to launch the app.';
    Canadarm.error(missingUsername, CernerSmartLaunch.errorObj);
    missingUsername += '<br>';
  }

  document.getElementById('error-message').innerHTML = '<p>' + missingTenantId + missingUsername + '</p>';
}

/**
 * Retrieve tenant id with getOAuthConsumerKey() call.
 * The tenant id is equivalent to oauth consumer key.
 * Retrieve username with getUsernameByPersonnelId
 * The user_person_id is the USR_PersonId from the query string.
 * Once that is done, we redirect the user to this
 * new URL.
 */
/* exported retrieveRequiredInfoAndRedirect */
function retrieveRequiredInfoAndRedirect(urlWithTenantPlaceHolder, user_person_id, persona) {

  if (persona === 'patient') {
    validateDataAndReportErrors(urlWithTenantPlaceHolder);
  } else if (persona === 'provider') {
    retrieveProviderInfoAndRedirect(urlWithTenantPlaceHolder, user_person_id);
  }
}

/**
 * Unable to launch SMART app because tenant id or username could not be obtained.
 */
/* exported getRequiredInfoFailed */
var getRequiredInfoFailed = function () { /* jshint unused:false */
  Canadarm.error('Unable to launch SMART app because tenant id ' +
    'or username could not be obtained.', CernerSmartLaunch.errorObj);
};
