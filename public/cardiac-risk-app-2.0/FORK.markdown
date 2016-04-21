## Cardiac Risk App (Forked)

This is a forked version of the original Cardiac Risk App located at https://github.com/smart-on-fhir/cardiac-risk-app.

The master branch is always in sync with the OSS version. Currently pointing to : https://github.cerner.com/Igneous/cardiac-risk-app/commit/474fe12393be2e557bb7da41e65f67b388c32337 .
The cerner/May2015 branch is in sync with the fhir-client.js file for version May2015 currently at :https://github.cerner.com/Igneous/cardiac-risk-app/commit/a0740faa1805ac1d5a5b6d79ba54526af6aedfa9 .
The cerner/dstu2 branch uses the DSTU2 version of fhir-client.js and is in sync with master branch at https://github.cerner.com/Igneous/cardiac-risk-app on commit : https://github.cerner.com/Igneous/cardiac-risk-app/commit/474fe12393be2e557bb7da41e65f67b388c32337 .



## Changes

- Update LOINC to include http
- Use UUID for client_id
- Call out specific scope instead of using *
