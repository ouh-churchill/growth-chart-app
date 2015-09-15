(function (window, undefined) {
  'use strict';
  var AppValidator = {};

  var loadData = function() {
    var ret = $.Deferred();

    var browserInfo = JSON.stringify($.browser);
    var userAgentInfo = navigator.userAgent.toString().toLowerCase();
    document.getElementById('browser-info').innerHTML = '<p> &check; Browser: ' + browserInfo + '</p>';
    document.getElementById('browser-user-agent').innerHTML = '<p> &check; User Agent: ' + userAgentInfo + '</p>';

    FHIR.oauth2.ready(function(smart) {
      var authenticated = function(param) {
        var header = null;

        if (smart.server.auth.type === 'bearer') {
          header = 'Bearer ' + smart.server.auth.token;
        }

        if (!param.headers) {param.headers = {};}
        param.headers['Content-Type'] = 'application/json+fhir';
        param.headers.Authorization = header;

        return param;
      };

      var getResourceById = function(name, id) {
        var uri = name + '/' + id;
        return getResource(name, uri);
      };

      var buildResponseBlock = function(name, url, data, status) {
        var divStyle = null;
        if (status === 200) {
          divStyle = '<div style=\'display: none\' id=' + name + '-details>';
        }
        else {
          divStyle = '<div id=' + name + '-details>';
        }

        var str = divStyle + '<pre>GET ' + url + '<br>Response: <br>' + JSON.stringify(data, null, 2) + '</pre></div>';
        return str;
      };

      var buildButton = function(buttonName) {
        return ' <button type=\'button\' name=btn' + buttonName + '>Show/Hide details</button>';
      };

      var getResource = function(name, uri) {
        var ret = new $.Deferred();
        var url = smart.server.serviceUrl + '/' + uri;
        var htmlStr = null;

        $.ajax(authenticated({
          type: 'GET',
          url: url,
          dataType: 'json'
        }))
        .done(function(data, textStatus, jqXHR) {
          htmlStr = '<p> &check; ' + name + ': ' + textStatus + ' - ' +
          jqXHR.status + buildButton(name) + buildResponseBlock(name, url, data, jqXHR.status) + '</p>';
          ret.resolve(data);
        })
        .fail(function(jqXHR, textStatus) {
          htmlStr = '<p> &cross; ' + name + ': ' + textStatus + ' - ' +
          jqXHR.status + buildButton(name) + buildResponseBlock(name, url, jqXHR, jqXHR.status) + '</p>';
        })
        .always(function() {
          document.getElementById(name).innerHTML = htmlStr;
        });
        return ret;
      };

      function Resource(name, patient, encounter, params) {
        this.name = name;
        this.patient = patient;
        this.encounter = encounter;
        this.params = params;
        this.uri = function() {
          var uri = this.name + '?' + 'patient=' + this.patient;

          if (this.encounter) {
            uri += '&encounter=' + this.encounter;
          }

          if (this.params) {
            uri += '&' + params;
          }

          return uri;
        };
      }

      var getFHIRHealthCheckURL = function() {
        var serviceURL = smart.server.serviceUrl;
        var rootURL = serviceURL.slice(0, serviceURL.lastIndexOf('/'));
        return (rootURL + '/meta/availability.json');
      };

      var getSMARTHealthCheckURL = function() {
        var serviceURL = smart.server.serviceUrl;
        // Remove tenant ID
        var rootURL = serviceURL.slice(0, serviceURL.lastIndexOf('/'));
        // Remove root path
        var fhirBaseURL = rootURL.slice(0, rootURL.lastIndexOf('/'));
        var smartBaseURL = fhirBaseURL.replace('fhir', 'smart');
        return (smartBaseURL + '/meta/availability.json');
      };

      function HealthCheck(name, display, url) {
        this.name = name;
        this.display = display;
        this.url = url;
      }

      var healthChecks = [ new HealthCheck('SMARTAppServiceHealthCheck',
                                           'SMART App Service Health Check',
                                           getSMARTHealthCheckURL()),
                           new HealthCheck('FHIRServiceHealthCheck',
                                           'FHIR Service Health Check',
                                           getFHIRHealthCheckURL())
                         ];

      function getHealthChecks(name, display, url) {
        $.getJSON(url, function(data, textStatus, jqXHR) {
          document.getElementById(name).innerHTML = '<p> &check; ' + display + ': ' + textStatus + ' - ' +
            jqXHR.status + '</p>';
        })
        .fail(function(jqXHR, textStatus)  {
          document.getElementById(name).innerHTML = '<p> &cross; ' + display + ': ' + textStatus + ' - ' +
            jqXHR.status + '</p>';
        });
      }

      for (var i = 0; i < healthChecks.length; i++) {
        var hc = healthChecks[i];
        getHealthChecks(hc.name, hc.display, hc.url);
      }

      var patientId = null;
      var encounterId = null;
      var userId = null;

      if (smart.tokenResponse) {
        patientId = smart.tokenResponse.patient;
        encounterId = smart.tokenResponse.encounter;
        userId = smart.tokenResponse.user;

        var successStr = '<p> &check; Authorization (OAuth2): success - 200</p>';
        document.getElementById('AuthorizationServer').innerHTML = successStr;
      }

      var resources = ['Conformance', 'Patient', 'Encounter', 'AllergyIntolerance', 'Condition', 'DiagnosticReport',
                       'Immunization', 'Observation', 'MedicationPrescription', 'DocumentReference'];

      for (var j = 0; j < resources.length; j++) {
        var resource = resources[j];

        if (resource === 'Conformance') {
          getResource('Conformance', 'metadata');
          continue;
        }

        var additionalParam = null;
        if (resource === 'MedicationPrescription') {
          additionalParam = 'status=active';
        }

        var resourceObj = new Resource(resource, patientId, encounterId, additionalParam);
        if (resource === 'Patient') {
          getResourceById(resourceObj.name, resourceObj.patient);
        }
        else if ((resource === 'Encounter') && encounterId) {
          getResourceById(resourceObj.name, resourceObj.encounter);
        }
        else if (resource === 'DocumentReference') {
          document.getElementById('DocumentReference').innerHTML = '<p>DocumentReference (write): ' +
                                  'Skipped as validating write transactions are not supported at this time.</p>';
        }
        else {
          getResource(resourceObj.name, resourceObj.uri());
        }
      }

    }, function(errback) {
      var failureStr = '<p> &cross; Authorization (OAuth2): ' + errback + '</p>';
      document.getElementById('AuthorizationServer').innerHTML = failureStr;
    });

    return ret.promise();
  };

  AppValidator.loadData = loadData;

  var authorize = function() {
    FHIR.oauth2.authorize({
      'client_id': 'af73d4a2-4909-40a3-bffb-78755bcf764c',
      'scope':  'launch online_access profile openid ' +
                'patient/Encounter.read patient/Patient.read patient/Observation.read patient/Immunization.read ' +
                'patient/AllergyIntolerance.read patient/Condition.read patient/DiagnosticReport.read ' +
                'patient/MedicationPrescription.read '
    }, function() {
      document.getElementById('AuthorizationServer').innerHTML = '<p> &cross; Authorization (OAuth2): ' +
      'Failed to discover the authorization URL.</p>';
    });
  };

  AppValidator.authorize = authorize;

  window.AppValidator = AppValidator;
  AppValidator._window = window;
}(this));
