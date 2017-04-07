# igneous-smart Server

igneous-smart provides both a registry and launcher for [SMART on FHIR applications](http://smartplatforms.org/smart-on-fhir/).

## Running Locally for Development

    bundle install
    rails server # now browse to http://localhost:3000

## Running Tests

    rake

## Setting header in the browser (for local development)

    Cerner-Trusted-Traffic : 'cerner'

## Listing SMART Applications

Callers can get a listing of all available SMART applications with the following route:

`GET /smart/:tenant_id/apps?:context_params`

See below for the support context parameters. You must provide context parameters as these will be used to build the app launch URLs for each of the SMART apps that is returned.

### Example

```
GET https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps?PAT_PersonId=123&VIS_EncntrId=456&username=ab01234
```

```
Content-Type: text/html; charset=utf-8
Status: 200 OK
Body: <HTML listing all available SMART apps and links to each>
```

## Launching SMART Applications

Callers can launch a SMART application (provided it exists within the internal registry) with the following route:

`GET /smart/:tenant_id/apps/:id?:context_params`

See below for the support context parameters.

### Example

#### SMART apps in an open model (no OAuth 2 authorization)

These types of SMART apps can be launched without OAuth 2. As such, the patient id in context is passed directly to the SMART app on launch via a query parameter.

```
GET https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps/1?PAT_PersonId=123&username=ab01234
```

```
Status: 302 Moved Temporarily
Location: http://hspc.isalusconsulting.com/demo/apps/bilirubin-chart/launch.html?fhirServiceUrl=https://fhir.cernerpowerchart.com/dstu2/open/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1&patientId=123
```

#### SMART apps with OAuth 2 authorization

This is the official SMART on FHIR application launch workflow. Context information is passed on launch via an opaque identifier that will ultimately be exchanged at the end of the OAuth 2 workflow for the actual context information.

```
GET https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps/1?PAT_PersonId=123&VIS_EncntrId=456&username=ab01234
```

```
Status: 302 Moved Temporarily
Location: http://hspc.isalusconsulting.com/demo/apps/bilirubin-chart/launch.html?iss=https://fhir.cernerpowerchart.com/dstu2/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1&launch=6176e752-94b5-499b-bcd7-68e85e3708ed
```

## Resolving launch context

The Authorization server evaluates the list of requested scopes. If a scope contains the prefix of "launch", it will contact the server to reify the launch scope via POST call.

### Example

```
POST https://fhir.cernerpowerchart.com/smart/launch/resolve
```
Request raw data:

```json
{ "aud" : "https://fhir.devcernerpowerchart.com/dstu2/2c400054-42d8-4e74-87b7-80b5bd5fde9f",
  "launch" : "6176e752-94b5-499b-bcd7-68e85e3708ed",
  "sub" : "ab01234",
  "ver" : "1.0",
  "tnt" : "2c400054-42d8-4e74-87b7-80b5bd5fde9f"
}
```

Response:
```
Content-Type: application/json
Status: 200 OK
```
```json
{
    "params": {
        "patient": "123",
        "ppr": "567",
        "encounter": "456",
        "user": "12345"
    },
    "claims": {
        "encounter": "456",
        "patient": "123",
        "ppr": "567",
        "user": "12345",
        "smart_style_url": "http://localhost:3000/styles/smart-v1.json,
        "need_patient_banner": false
    },
    "ver": "1.0",
    "userfhirurl": "https://fhir.devcernerpowerchart.com/dstu2/2c400054-42d8-4e74-87b7-80b5bd5fde9f/Practitioner/12345"
}
```

## Reporting SMART App Validator results

The SMART App Validator will send down the validation results to the SMART server for the logging purposes via POST call.

### Example

```
POST https://smart.cernerpowerchart.com/smart/validator/results
```
Request raw data:

```json
{ "browserInfo" : { "msie" : "true", "version" : "7.0" },
  "userAgent" : "mozilla/4.0",
  "tenant" : "2c400054-42d8-4e74-87b7-80b5bd5fde9f",
  "user" : "kh046333",
  "successCount" : 8,
  "failureCount" : 1,
  "resourceCount" : 9,
  "resources" : [{
      "name" : "conformance",
      "textStatus" : "success",
      "statusCode" : 200,
      "responseHeaders": "Date: Thu, 05 Nov 2015 17:54:38 GMT Cache-Control: no-cache"
  }]
}
```

Response:
```
Status: 204
```

## JSON APIs

The SMART server currently supports several routes via JSON requests.

### Retrieving a list of SMART applications

Set the following headers:
- `Authorization` header with bearer token of [B2B system account](https://associates.cernercentral.com/system-accounts/) to access this protected resource
- `Accept` header with `application/json`

`GET /smart/:tenant_id/apps`

#### Example

```
GET https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps
```

```
Accept: application/json
Authorization: Bearer put-b2b-token-here
```

```
Response:
Status: 200
```

```json
[
  {
    "name": "Cardiac Risk App DSTU2",
    "url": "https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps/4ae44710-dc6e-4c52-82ef-877106846cab"
  },
  {
    "name": "SMART Pediatric Growth Chart App DSTU2",
    "url": "https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps/ddffda5f-3cdc-4efc-bf98-0b1e58a56537"
  }
]
```

### Retrieving SMART launch URL and OAuth2 base URL

This API is helpful if you'd like to retrieve the SMART launch URL with the `launch` id created in the URL.  The caller would also get the OAuth2 base URL with this call.  This is the API to call if you'd like to launch a SMART application outside of PowerChart (e.g. RevenueCycle).

From the API above, the caller gets a list of SMART applications.  The caller would then construct the list of supported and required query parameters like below for the API call: 

```
PAT_PersonId=123&VIS_EncntrId=456&PAT_PPRCode=1116&USR_PersonId=1900022&username=kk014173
```
See the list of supported query parameters below.

Set the following header:
- `Accept` header with `application/json`

#### Example

```
GET https://smart.cernerpowerchart.com/smart/nya9mWd9vqI_z1LcF5uLfCwewAGCVrY1/apps/1?PAT_PersonId=123&VIS_EncntrId=456&PAT_PPRCode=1116&USR_PersonId=1900022&username=kk014173
```

```
Accept: application/json
```

```
Response:
Status: 200
```

```json
{
  "smart_launch_url": "https://smart.cernerpowerchart.com/smart-app-validator-2.0/launch.html?iss=https%3A%2F%2Ffhir.cernerpowerchart.com%2Fdstu2%2Fnya9mWd9vqI_z1LcF5uLfCwewAGCVrY1&launch=e0cc92a9-f34e-4fb5-b628-7007d7f7972b",
  "oauth2_base_url": "https://authorization.cerner.com"
}
```

## Required Context Parameter

Name           | Description
-------------- | -----------
username       | The username of the clinician (user) launching the SMART app  

## Supported Context Parameters

These context parameters are the [same available within the MPages framework](https://wiki.ucern.com/display/public/1101discernHP/Context+Variables+Available+using+Discern+Explorer).

Name           | Description
-------------- | -----------
PAT_PersonId   | The patient id
PAT_PPRCode    | The patient provider relationship (PPR) code value
VIS_EncntrId   | The encounter id
USR_PersonId   | The id of the clinician (user) launching the SMART app
USR_PositionCd | The position code value of the clinician (user) launching the SMART app
DEV_Location   | The device location
APP_AppName    | The name of the SMART container application

The context parameter(s) that you provided are dependent upon the SMART app being launched. Generally speaking, most apps will need the patient id (PAT_PersonId) and possibly the encounter id (VIS_EncntrId).

