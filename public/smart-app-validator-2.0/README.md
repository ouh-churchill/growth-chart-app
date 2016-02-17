## SMART App Validator 2.0##

This SMART app runs inside of PowerChart, just like any other SMART app.  This app helps clients determine if their setup/cofiguration is "ready" to use and launch their SMART app.
FHIR Client Version : DSTU2 Final

### This SMART App Validator checks: ###

- Authorization (OAuth2) Server
- Conformance
- Patient
- Encounter
- Condition
- AllergyIntolerance
- Observation
- DiagnosticReport
- Immunization
- MedicationOrder
- DocumentReference

Each one of these resources will be called using read or search option.  As of now, no data is written to the patient/encounter in context.

### Future Plan ###

In the future, it would be great to discover the conformance data and query each available resource using the its available method (read, search-set, create).
