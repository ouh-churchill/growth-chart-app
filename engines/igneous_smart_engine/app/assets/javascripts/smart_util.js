/**
 * Get the value of paramStr in query parameter based on the urlStr.
 * urlStr - the URL with query param
 * paramStr - the value of the parameter to search
 *
 * return value for paramStr or empty string if paramStr not found.
 */
/* exported parseQueryParamByStr */
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
