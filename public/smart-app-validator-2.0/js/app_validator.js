(function (window, undefined) {
  'use strict';
  var AppValidator = {};

  var tenant = null;

  var loadData = function() {
    var ret = $.Deferred();

    var browserInfo = JSON.stringify($.browser);
    var userAgentInfo = navigator.userAgent.toString().toLowerCase();

    document.getElementById('browser-info').innerHTML = '<p> &check; Browser: ' + browserInfo + '</p>';
    document.getElementById('browser-user-agent').innerHTML = '<p> &check; User Agent: ' + userAgentInfo + '</p>';

    FHIR.oauth2.ready(function(smart) {

      var results = {};
      results.browserInfo = $.browser;
      results.userAgent = userAgentInfo;
      results.tenant = tenant;
      results.user = smart.tokenResponse.username;
      results.resources = [];
      results.successCount = 0;
      results.failureCount = 0;

      var serviceUrl = smart.server.serviceUrl;
      document.getElementById('tenant').innerHTML = serviceUrl.substr(serviceUrl.lastIndexOf('/') + 1);

      var authenticated = function(param) {
        var header = null;

        if (smart.server.auth.type === 'bearer') {
          header = 'Bearer ' + smart.server.auth.token;
        }

        if (!param.headers) {param.headers = {};}
        param.headers['Content-Type'] = 'application/json+fhir';
        param.headers['Accept'] = 'application/json+fhir';
        param.headers.Authorization = header;

        return param;
      };

      var getResourceById = function(name, id) {
        var uri = name + '/' + id;
        return getResource(name, uri);
      };

      var buildResponseBlock = function(name, url, response_headers, data, status) {
        var divStyle = null;
        if (status === 200) {
          divStyle = '<div style=\'display: none\' id=' + name + '-details>';
        }
        else {
          divStyle = '<div id=' + name + '-details>';
        }

        var str = divStyle + '<pre>GET ' + url + '<br>Response headers: <br>' + response_headers +
            '<br>Response: <br>' + JSON.stringify(data, null, 2) + '</pre></div>';
        return str;
      };

      var buildButton = function(buttonName) {
        return ' <button type=\'button\' name=btn' + buttonName + '>Show/Hide details</button>';
      };

      function buildValidatorResult(name, textStatus, jqXHR, url, successFlag) {
        var resource = {};
        resource.name = name;
        resource.textStatus = textStatus;
        resource.statusCode = jqXHR.status;
        resource.responseHeaders = jqXHR.getAllResponseHeaders().replace(/(\r|\n)/g, ' ');
        resource.requestUrl = url;
        if (!successFlag) {
          resource.response = JSON.parse(JSON.stringify(jqXHR));
        }
        results.resources.push(resource);
      }

      var getResource = function(name, uri) {
        var url = smart.server.serviceUrl + '/' + uri;
        var htmlStr = null;

        return $.ajax(authenticated({
          type: 'GET',
          url: url,
          dataType: 'json'
        }))
            .done(function(data, textStatus, jqXHR) {
              buildValidatorResult(name, textStatus, jqXHR, url, true);
              results.successCount += 1;
              htmlStr = '<p> &check; ' + name + ': ' + textStatus + ' - ' + jqXHR.status + buildButton(name) +
              buildResponseBlock(name, url, jqXHR.getAllResponseHeaders(), data, jqXHR.status) + '</p>';
              if (name === 'Conformance') {
                processConformance(data);
              }
            })
            .fail(function(jqXHR, textStatus) {
              buildValidatorResult(name, textStatus, jqXHR, url, false);
              results.failureCount += 1;
              htmlStr = '<p> &cross; ' + name + ': ' + textStatus + ' - ' + jqXHR.status + buildButton(name) +
              buildResponseBlock(name, url, jqXHR.getAllResponseHeaders(), jqXHR, jqXHR.status) + '</p>';
              if (name === 'Conformance') {
                //Since conformance call failed we report the error for conformance and dont make any other
                // service calls.
                reportResults(AppValidator.deferreds, 1);
              }
            })
            .always(function() {
              document.getElementById(name).innerHTML = htmlStr;
            });
      };

      function Resource(name, patient, encounter, params, displayName) {
        this.resourceDisplayName = displayName.length ? displayName : name;
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

          return encodeURI(uri);
        };
      }

      function getResources(resources, deferreds) {

        for (var j = 0; j < resources.length; j++) {
          var resource = resources[j];
          var resourceDisplayName = '';

          var additionalParam = null;

          if (resource === 'Condition-diagnosis') {
            resource = 'Condition';
            resourceDisplayName = 'Condition-diagnosis';
            additionalParam = 'category=diagnosis';
          }

          if (resource === 'Condition-problem') {
            resource = 'Condition';
            resourceDisplayName = 'Condition-problem';
            additionalParam = 'category=problem';
          }

          if (resource === 'Condition-health-concern') {
            resource = 'Condition';
            resourceDisplayName = 'Condition-health-concern';
            additionalParam = 'category=health-concern';
          }

          if (resource === 'Observation-laboratory') {
            resource = 'Observation';
            resourceDisplayName = 'Observation-laboratory';
            additionalParam = 'category=laboratory';
          }

          if (resource === 'Observation-vital-signs') {
            resource = 'Observation';
            resourceDisplayName = 'Observation-vital-signs';
            additionalParam = 'category=vital-signs';
          }

          if (resource === 'Observation-social-history') {
            resource = 'Observation';
            resourceDisplayName = 'Observation-social-history';
            additionalParam = 'category=social-history';
          }

          if (resource === 'CarePlan-CareTeam') {
            resource = 'CarePlan';
            resourceDisplayName = 'CarePlan-CareTeam';
            additionalParam = 'category=http://argonaut.hl7.org|careteam';
          }

          if (resource === 'CarePlan-assess-plan') {
            resource = 'CarePlan';
            resourceDisplayName = 'CarePlan-assess-plan';
            additionalParam = 'category=assess-plan';
          }

          if (resource === 'DocumentReference') {
            resource = 'DocumentReference/$docref';
            resourceDisplayName = 'DocumentReference';
            additionalParam = 'type=http://loinc.org|34133-9';
          }

          if (resource === 'Binary') {
            resource = 'Binary/$autogen-ccd-if';
            resourceDisplayName = 'Binary';

          }

          var resourceObj = new Resource(resource, patientId, encounterId, additionalParam, resourceDisplayName);

          if (resource === 'Patient') {
            deferreds.push(getResourceById(resourceObj.name, resourceObj.patient));
          }
          else {
            deferreds.push(getResource(resourceObj.resourceDisplayName, resourceObj.uri()));
          }
        }

        reportResults(deferreds, resources.length);
      }

      var getFHIRHealthCheckURL = function() {
        var serviceURL = smart.server.serviceUrl;
        var rootURL = serviceURL.slice(0, serviceURL.lastIndexOf('/'));
        return (rootURL + '/meta/availability.json');
      };

      var getSMARTServerURL = function() {
        var serviceURL = smart.server.serviceUrl;
        // Remove tenant ID
        var rootURL = serviceURL.slice(0, serviceURL.lastIndexOf('/'));
        // Remove root path
        var fhirBaseURL = rootURL.slice(0, rootURL.lastIndexOf('/'));
        if (fhirBaseURL.includes('fhir-ehr')) {
          return (fhirBaseURL.replace('fhir-ehr', 'smart'));
        }
        else if (fhirBaseURL.includes('fhir-myrecord')) {
          return (fhirBaseURL.replace('fhir-myrecord', 'smart'));
        }

        return (fhirBaseURL.replace('fhir', 'smart'));
      };

      var getSMARTHealthCheckURL = function() {
        return (getSMARTServerURL() + '/meta/availability.json');
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

      function reportResults(deferreds, resourceCount) {
        var count = 0;

        $.when.apply($, $.map(deferreds, function(deferred) {
          var ret = $.Deferred();

          deferred.always(function() {
            count = count + 1;

            // DocumentReference does not make any Ajax call, so ignore that resource when checking for count
            if (count === resourceCount - 1) {

              var url = getSMARTServerURL() + '/smart/validator/results';
              results.resourceCount = resourceCount - 1;

              $.ajax({
                url: url,
                type: 'POST',
                beforeSend: function (request)
                {
                  request.setRequestHeader('Accept', 'application/json');
                },
                data: results
              });
            }
            ret.resolve();
          });
          return ret.promise();
        }));
      }

      function processConformance(data) {

        var availableResources = [];
        if (data && data.hasOwnProperty('rest') && Array.isArray(data.rest)) {
          data.rest[0].resource.forEach(function (resource){
            if (resource.type === 'Condition'){
              availableResources.push('Condition-diagnosis', 'Condition-problem', 'Condition-health-concern');
            }
            else if (resource.type === 'Observation') {
              availableResources.push('Observation', 'Observation-laboratory', 'Observation-vital-signs', 'Observation-social-history');
            }
            else if (resource.type === 'CarePlan') {
              availableResources.push('CarePlan-CareTeam', 'CarePlan-assess-plan');
            }
            else {
              availableResources.push(resource.type);
            }
          });
        }

        var supportedResources = ['Patient', 'Encounter', 'AllergyIntolerance', 'Condition-diagnosis',
          'Condition-problem', 'Condition-health-concern', 'DiagnosticReport', 'Immunization', 'Observation', 'Observation-laboratory', 'Observation-vital-signs', 'Observation-social-history', 'MedicationOrder',
          'MedicationStatement', 'DocumentReference', 'CarePlan-CareTeam', 'Device', 'CarePlan-assess-plan', 'Goal', 'Binary', 'Procedure'];
        /* jshint bitwise: false */
        AppValidator.resources = availableResources.filter(function(r){return ~this.indexOf(r);}, supportedResources);

        // Make the UI visible for the resources ready to be called.
        AppValidator.resources.forEach(function(r){
          $('#' + r.toString()).show();
        });

        getResources(AppValidator.resources, AppValidator.deferreds);

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

      AppValidator.deferreds = [];
      AppValidator.resources = [];
      //Look for conformance first to build the list of resources to be called for a given
      //fhir endpoint.
      AppValidator.deferreds.push(getResource('Conformance', 'metadata'));

    }, function(errback) {
      var failureStr = '<p> &cross; Authorization (OAuth2): ' + errback + '</p>';
      document.getElementById('AuthorizationServer').innerHTML = failureStr;
    });

    return ret.promise();
  };

  AppValidator.loadData = loadData;

  var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
        return sParameterName[1] === undefined ? true : sParameterName[1];
      }
    }
  };

  var authorize = function(client_id) {

    var iss = getUrlParameter('iss');

    tenant = iss.substr(iss.lastIndexOf('/') + 1);

    if (!iss) {
      console.log("iss parameter not provided");
    }

    var launch = getUrlParameter('launch');

    var scopes =  'online_access profile openid ' +
        'patient/Encounter.read patient/Patient.read patient/Observation.read patient/Immunization.read ' +
        'patient/AllergyIntolerance.read patient/Condition.read patient/DiagnosticReport.read ' +
        'patient/MedicationOrder.read patient/MedicationStatement.read patient/Binary.read ' +
        'patient/CarePlan.read patient/Device.read patient/DocumentReference.read patient/Goal.read ' +
        'patient/Procedure.read patient/CareTeam.read';

    if (launch) {
      scopes =  'launch ' + scopes;
    } else {
      scopes = 'launch/patient ' + scopes;
    }

    FHIR.oauth2.authorize({
      'client_id': client_id,
      'scope': scopes
    }, function() {
      document.getElementById('AuthorizationServer').innerHTML = '<p> &cross; Authorization (OAuth2): ' +
      'Failed to discover the authorization URL.</p>';
    });
  };

  AppValidator.authorize = authorize;

  window.AppValidator = AppValidator;
  AppValidator._window = window;
}(this));
