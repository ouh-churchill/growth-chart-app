/**
 * smart-powerchart-refresh.js
 * Requires jQuery to be loaded before loading this file.
 * This file contains code to workaround a defect in Cerner PowerChart.
 * If there are multiple SMART apps opened, hitting Refresh button could
 * potentially display wrong patient information.  An enhancement is
 * currently being worked on to address this issue.
 *
 * Usage: Include this file in all HTML pages in the <head> section.
 * <script src="https://smart.cernerpowerchart.com/js/smart-powerchart-refresh.min.js"></script>
 */

/**
 * This method is internal to MPage Framework. MPage Framework would
 * normally inject this method in.  However, for the case when the page
 * is loaded via a URL, this method is not injected in. There is a CR 1-10417131101
 * logged to address this issue in MPage Framework.
 *
 * This is needed because it is used to call overrideRefresh method from MPage.
 *
 * Once CR 1-10417131101 is addressed and package is installed,
 * this code block below can be removed.
 */
/*jshint unused:false*/
/*jshint -W061 */
function evaluate(x) {
  return eval(x);
}

/**
 * This function makes a call to the MPage framework to register the callback function
 * so that when refresh occurs inside PowerChart, the callback function will be able
 * to handle the refresh action accordingly.
 */
function registerRefreshOverrideCallback() {
  try {
    window.external.MPAGESOVERRIDEREFRESH('overrideRefresh()');
  } catch (e) {}
}

/**
 * Refresh is not currently supported for SMART apps inside of PowerChart.
 */
/*jshint unused:false*/
function overrideRefresh() {
  window.alert('Refresh action is currently not supported for this application.\n' +
              'Please use Home button to reload this application.');
}

/**
 * On document ready, overrides the refresh button in PowerChart.
 */
$(document).ready(function() {
  registerRefreshOverrideCallback();
});

/**
 * Every 2 seconds, register the overrideRefresh() callback function.
 * The MPage framework listens on page navigation, either to a new page
 * or to the same page via anchor link and cancels the refresh callback.
 *
 * This is so that the callback is re-registered after canceled by MPage.
 */
window.setInterval(registerRefreshOverrideCallback, 2000);

