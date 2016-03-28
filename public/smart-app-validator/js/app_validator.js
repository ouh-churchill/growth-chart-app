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

      var results = {};
      results.browserInfo = $.browser;
      results.userAgent = userAgentInfo;
      results.tenant = smart.tokenResponse.tenant;
      results.user = smart.tokenResponse.username;
      results.resources = [];
      results.successCount = 0;
      results.failureCount = 0;

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
        })
        .fail(function(jqXHR, textStatus) {
          buildValidatorResult(name, textStatus, jqXHR, url, false);
          results.failureCount += 1;
          htmlStr = '<p> &cross; ' + name + ': ' + textStatus + ' - ' + jqXHR.status + buildButton(name) +
              buildResponseBlock(name, url, jqXHR.getAllResponseHeaders(), jqXHR, jqXHR.status) + '</p>';
        })
        .always(function() {
          document.getElementById(name).innerHTML = htmlStr;
        });
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

          return encodeURI(uri);
        };
      }

      function getResources() {
        var resources = ['Conformance', 'Patient', 'Encounter', 'AllergyIntolerance', 'Condition', 'DiagnosticReport',
          'Immunization', 'Observation', 'MedicationPrescription', 'DocumentReference', 'MedicationStatement'];

        var deferreds = [];

        for (var j = 0; j < resources.length; j++) {
          var resource = resources[j];

          if (resource === 'Conformance') {
            deferreds.push(getResource('Conformance', 'metadata'));
            continue;
          }

          var additionalParam = null;
          if (resource === 'AllergyIntolerance') {
            additionalParam = 'status=unconfirmed';
          }

          if (resource === 'Condition') {
            additionalParam = 'category=diagnosis&clinicalstatus=confirmed,unknown';
          }

          if (resource === 'MedicationPrescription') {
            additionalParam = 'status=active&_count=20';
          }

          var priorDate = new Date();
          var monthsToDeduct = 6;
          priorDate.setMonth(priorDate.getMonth() - monthsToDeduct);

          if ( resource === 'MedicationStatement') {
            additionalParam = 'status=completed&_count=10&effectivedate=>=' + priorDate.toISOString();
          }

          if (resource === 'Observation') {
            var currentDate = new Date();

            additionalParam = 'code=http://loinc.org|30522-7,http://loinc.org|14647-2,http://loinc.org|2093-3,' +
                'http://loinc.org|2085-9,http://loinc.org|8480-6,http://loinc.org|3141-9,http://loinc.org|8302-2,' +
                'http://loinc.org|8287-5,http://loinc.org|39156-5,http://loinc.org|18185-9,http://loinc.org|37362-1';

            additionalParam += '&date=<' + currentDate.toISOString() + '&date=>' + priorDate.toISOString();
            additionalParam += '&_count=20';
          }

          var resourceObj = new Resource(resource, patientId, encounterId, additionalParam);

          if (resource === 'Patient') {
            deferreds.push(getResourceById(resourceObj.name, resourceObj.patient));
          }
          else if ((resource === 'Encounter') && encounterId) {
            deferreds.push(getResourceById(resourceObj.name, resourceObj.encounter));
          }
          else if (resource === 'DocumentReference') {
            document.getElementById('DocumentReference').innerHTML = '<p>DocumentReference (write): ' +
                'Skipped as validating write transactions are not supported at this time.</p>';
          }
          else {
            deferreds.push(getResource(resourceObj.name, resourceObj.uri()));
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

      getResources();

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
                'patient/MedicationPrescription.read patient/MedicationStatement.read '
    }, function() {
      document.getElementById('AuthorizationServer').innerHTML = '<p> &cross; Authorization (OAuth2): ' +
      'Failed to discover the authorization URL.</p>';
    });
  };

  AppValidator.authorize = authorize;

  window.AppValidator = AppValidator;
  AppValidator._window = window;
}(this));
