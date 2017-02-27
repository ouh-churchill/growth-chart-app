/* globals retrieveRequiredInfoAndRedirect, retrieveProviderInfoAndRedirect */
// Global variables
var CERNER_SMART_LAUNCH = {};
CERNER_SMART_LAUNCH.oauth2BaseURL = '';
CERNER_SMART_LAUNCH.launchURL = '';
CERNER_SMART_LAUNCH.preauthTimeoutVar = null;
CERNER_SMART_LAUNCH.timeoutIntervalSec = 20; // 20 seconds
CERNER_SMART_LAUNCH.errorObj = new Error();
CERNER_SMART_LAUNCH.launchId = '';

// Initialize XMLCclRequest
CERNER_SMART_LAUNCH.requestSync = new XMLCclRequest();

/**
 * Get the value of paramStr in query parameter based on the urlStr.
 * urlStr - the URL with query param
 * paramStr - the value of the parameter to search
 *
 * return value for paramStr or empty string if paramStr not found.
 */
function parseQueryParamByStr(urlStr, paramStr) {
  var indexOfParamStr = urlStr.indexOf(paramStr);
  if (indexOfParamStr === -1) {
    return '';
  }

  var beginParam = urlStr.substring(indexOfParamStr, urlStr.length);
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

function validateDataAndReportErrors(urlWithTenantPlaceHolder) {

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
    'or username could not be obtained.', CERNER_SMART_LAUNCH.errorObj);
};
