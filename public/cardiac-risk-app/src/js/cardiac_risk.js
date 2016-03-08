(function (window, undefined) {

    /**
     * Data Model to hold all data elements for the Cardiac Risk App.
     * This will hold the following dataObjects:
     *    1. patientInfo : firstName, lastName, gender, dateOfBirth, age, hsCReactiveProtein, totalCholesterol, hdl, ldl, systolicBloodPressure
     *    2. relatedFactors : smoker(BOOL), familyHeartAttackHistory (BOOL)
     *    3. colorClasses : This will include color classes required for updating UI.
     * methods :
     *    1. fetchDataAndPopulateCardiacRiskObject : Method to get data from the service for the requested LOINC codes.
     *    2. getCholesterolValue : To extract cholesterol value from the service response.
     *    3. getHSCRPValue : To extract High Sensitivity C Reactive protein value from the service response.
     *    4. getSystolicBloodPressureValue : To extract systolic blood pressure value from the service response.
     *    5. computeAgeFromBirthDate : Computes age.
     *    6. computeRRS : Computes the Reynold Risk Score(RRS)
     *    7. computeWhatIfSBP : Computes different states for available systolic blood pressure values.
     *    8. computeWhatIfNotSmoker : Computes different states based on patients somking status.
     *    9. computeWhatIfOptimal : Computes state for when the RRS is optimal with optimal values for related factors.
     *    10. computePatientActions : Computes patients actions to be displayed to the user.
     *    11. validateLabsForMissingValueErrors : Error checks for missing Lab Values.
     *    12. validateLabsForOutOfBoundsValueErrors : Error checks for out of bounds Lab Values.
     *    13. buildWhatIfOptimalValues : Builds the strings for display of whatIfOptimalValues based on the score.
     *    14. buildWhatIfNotSmoker : Builds the strings for display of whatIfNotSmoker based on the score.
     *    15. canCalculateCardiacRiskScore : Checks if the Cardiac Risk data model has sufficient data to compute the RRS.
     *    16. isValidSysBP : Validates the provided systolic blood pressure value for bounds and availability.
     *    17. optimalLabs : Computes if the lab values are optimal and returns a boolean.
     *    18. isValidValueQuantityObject : Computes if the object is valid considering its structure.
     *    19. validateModelForErrors : Validates the CardiacRisk model properties for the required values to compute RRS and returns error text.
     */
    "use strict";
    var CardiacRisk = {};
    var PatientInfo = {};

    /**
     * Loads patient FHIR data and updates the patientInfo data model associated with CardiacRisk data model.
     * Fetches patient context to get basic patient info and observations to get lab results based on the
     * supplied LOINC codes.
     * LOINC Codes used : 'http://loinc.org|30522-7', 'http://loinc.org|14647-2', 'http://loinc.org|2093-3', 'http://loinc.org|2085-9', 'http://loinc.org|8480-6'
     * @method fetchDataAndPopulateCardiacRiskObject
     */
    var fetchDataAndPopulateCardiacRiskObject = function () {
        var deferred = $.Deferred();
        FHIR.oauth2.ready(onReady,onError);
        function onReady(smart) {
            CardiacRisk.hideDemographicsBanner = (smart.tokenResponse.need_patient_banner === false);

            var patient = smart.context.patient;
            var patientData = patient.read();
            var labs = patient.Observation.where
                .codeIn('http://loinc.org|2089-1', 'http://loinc.org|13457-7',
                'http://loinc.org|30522-7', 'http://loinc.org|14647-2',
                'http://loinc.org|2093-3', 'http://loinc.org|2085-9', 'http://loinc.org|8480-6')
                .search();

            $.when(patientData, labs)
                .done(function (patient, labs_result) {
                    PatientInfo.firstName = patient.name[0].given.join(' ');
                    PatientInfo.lastName = patient.name[0].family.join(' ');
                    PatientInfo.gender = patient.gender;
                    PatientInfo.dateOfBirth = new Date(patient.birthDate);
                    PatientInfo.age = CardiacRisk.computeAgeFromBirthDate(PatientInfo.dateOfBirth);

                    //Populate the CardiacRisk Object with available values.
                    CardiacRisk.patientInfo = PatientInfo;

                    var loincCodes = smart.byCodes(labs_result[0], 'code');
                    var hsCRP = loincCodes('30522-7');
                    var cholesterol = loincCodes('14647-2', '2093-3');
                    var hdl = loincCodes('2085-9');
                    var sbp = loincCodes('8480-6');
                    var ldlDirect = loincCodes('2089-1');
                    var ldlCalculated = loincCodes('13457-7');

                    CardiacRisk.patientInfo.hsCReactiveProtein = CardiacRisk.getHSCRPValue(hsCRP);
                    CardiacRisk.patientInfo.totalCholesterol = CardiacRisk.getCholesterolValue(cholesterol);
                    CardiacRisk.patientInfo.hdl = CardiacRisk.getCholesterolValue(hdl);
                    CardiacRisk.patientInfo.ldl = CardiacRisk.getCholesterolValue(ldlDirect);
                    if (CardiacRisk.patientInfo.ldl === undefined) {
                        CardiacRisk.patientInfo.ldl = CardiacRisk.getCholesterolValue(ldlCalculated);
                    }
                    CardiacRisk.patientInfo.systolicBloodPressure = CardiacRisk.getSystolicBloodPressureValue(sbp);
                    var relatedFactors = {};
                    /* Default to null since we want to remove error state on radio buttons on the first go */
                    relatedFactors.smoker = undefined;
                    relatedFactors.familyHeartAttackHistory = undefined;
                    CardiacRisk.patientInfo.relatedFactors = relatedFactors;

                    CardiacRisk.colorClasses = {
                        lowRisk: 'backgroundColorLowRisk',
                        lowModerateRisk: 'backgroundColorLowModerateRisk',
                        moderateRisk: 'backgroundColorModerateRisk',
                        highRisk: 'backgroundColorHighRisk',
                        rangeSliderThumbWhiteText: 'rangeSliderThumbStyleWhite',
                        grayBarColor: 'colorGray'
                    };

                    deferred.resolve();
                })
                .fail(function () {
                    processError('There was an error loading the component.');
                    deferred.fail();
                });
        }
        function onError() {
            processError('There was an error loading the component.');
            deferred.reject();
        }
        return deferred.promise();
    };
    CardiacRisk.fetchDataAndPopulateCardiacRiskObject = fetchDataAndPopulateCardiacRiskObject;

    /**
     * Fetches current cholesterol into units of mg/dL
     * @method getCholesterolValue
     * @param {object} cholesterol - Cholesterol array object with valueQuantity elements having units and value.
     */
    var getCholesterolValue = function (cholesterol) {

        if (CardiacRisk.isValidValueQuantityObject(cholesterol)) {
            if (cholesterol[0].valueQuantity.units === 'mg/dL') {
                return parseFloat(cholesterol[0].valueQuantity.value);
            }
            else if (cholesterol[0].valueQuantity.units === 'mmol/L') {
                return parseFloat(cholesterol[0].valueQuantity.value) / 0.026;
            }
            else if (cholesterol[0].valueQuantity.units) {
                processError('One or more results has an unsupported unit of measure. Cardiac Risk cannot be calculated.');
                return;
            }
        }
        return undefined;
    };
    CardiacRisk.getCholesterolValue = getCholesterolValue;

    /**
     * Fetches current high sensitivity C-reactive protein into value in mg/L
     * @method getHSCRPValue
     * @param {object} hscrp - hscrp array object with valueQuantity elements having units and value.
     */
    var getHSCRPValue = function (hscrp) {

        if (CardiacRisk.isValidValueQuantityObject(hscrp)) {
            if (hscrp[0].valueQuantity.units === 'mg/L') {
                return parseFloat(hscrp[0].valueQuantity.value);
            }
            else if (hscrp[0].valueQuantity.units === 'mmol/L') {
                return parseFloat(hscrp[0].valueQuantity.value) / 0.10;
            }
            else if (hscrp[0].valueQuantity.units)
            {
                processError('One or more results has an unsupported unit of measure. Cardiac Risk cannot be calculated.');
                return;
            }
        }
        return undefined;
    };
    CardiacRisk.getHSCRPValue = getHSCRPValue;

    /**
     * Fetches current Systolic Blood Pressure
     * @method getSystolicBloodPressureValue
     * @param {object} sysBloodPressure - sysBloodPressure array object with valueQuantity elements having units and value.
     */
    var getSystolicBloodPressureValue = function (sysBloodPressure) {
        if (typeof sysBloodPressure !== undefined && sysBloodPressure.length > 0) {
            if (sysBloodPressure[0].hasOwnProperty('valueQuantity')) {
                return parseFloat(sysBloodPressure[0].valueQuantity.value);
            }
        }
        return undefined;
    };
    CardiacRisk.getSystolicBloodPressureValue = getSystolicBloodPressureValue;

    /**
     * Method to calculate age from the provided date of birth considering leapYear.
     * @param birthDate - Date of birth in Date Object format.
     * @returns {number} - Age of the person.
     */
    var computeAgeFromBirthDate = function (birthDate) {

        function isLeapYear(year) {
            return new Date(year, 1, 29).getMonth() == 1;
        }

        var now = new Date();
        var years = now.getFullYear() - birthDate.getFullYear();
        birthDate.setFullYear(birthDate.getFullYear() + years);
        if (birthDate > now) {
            years--;
            birthDate.setFullYear(birthDate.getFullYear() - 1);
        }
        var days = (now.getTime() - birthDate.getTime()) / (3600 * 24 * 1000);
        return Math.floor(years + days / (isLeapYear(now.getFullYear()) ? 366 : 365));

    };
    CardiacRisk.computeAgeFromBirthDate = computeAgeFromBirthDate;

    /**
     * Computes the widely-used Reynolds Risk Score, a score that estimates the 10-year cardiovascular risk of an individual.
     * See {@link http://www.reynoldsriskscore.org/}
     * @method computeRRS
     * @param {object} patientInfo - patientInfo object from CardiacRisk data model.
     */
    var computeRRS = function (patientInfo) {
        var params = {};
        if (patientInfo.gender.toLowerCase() === 'female') {
            params = {
                'age': 0.0799,
                'sbp': 3.137,
                'hsCRP': 0.180,
                'cholesterol': 1.382,
                'HDL': -1.172,
                'smoker': 0.818,
                'fx_of_mi': 0.438
            };
        } else if (patientInfo.gender.toLowerCase() === 'male') {
            params = {
                'age': 4.385,
                'sbp': 2.607,
                'hsCRP': 0.102,
                'cholesterol': 0.963,
                'HDL': -0.772,
                'smoker': 0.405,
                'fx_of_mi': 0.541
            };
        }

        function computeTotalParams(params, patientInfo) {
            var ageParam = params.age * (patientInfo.gender.toLowerCase() === 'female' ? patientInfo.age : Math.log(patientInfo.age));
            var sbpParam = params.sbp * Math.log(patientInfo.systolicBloodPressure);
            var crpParam = params.hsCRP * Math.log(patientInfo.hsCReactiveProtein);
            var cholesterolParam = params.cholesterol * Math.log(patientInfo.totalCholesterol);
            var hdlParam = params.HDL * Math.log(patientInfo.hdl);
            var smokerParam = params.smoker * (patientInfo.relatedFactors.smoker ? 1 : 0);
            var famHistoryParam = params.fx_of_mi * (patientInfo.relatedFactors.familyHeartAttackHistory ? 1 : 0);
            return ageParam + sbpParam + crpParam + cholesterolParam + hdlParam + smokerParam + famHistoryParam;
        }

        function computeResult(params, patientInfo) {
            var scoreConstants = (patientInfo.gender.toLowerCase() === 'female') ? [22.325, 0.98634] : [33.097, 0.8990];
            var totalParams = computeTotalParams(params, patientInfo);
            var result = (1 - Math.pow(scoreConstants[1], (Math.exp(totalParams - scoreConstants[0])))) * 100;
            return result;
        }

        var riskResult = computeResult(params, patientInfo);

        return Math.round(riskResult < 10 ? riskResult.toPrecision(1) : riskResult.toPrecision(2));
    };
    CardiacRisk.computeRRS = computeRRS;

    /**
     * Computes RRS for a patient with a potential systolic blood pressure of 10 mm/Hg lower than their current
     * systolic blood pressure
     * @method computeWhatIfSBP
     */
    var computeWhatIfSBP = function () {
        var whatIfSBP = {};
        var patientInfoCopy = $.extend(true, {}, CardiacRisk.patientInfo);
        if (patientInfoCopy.systolicBloodPressure >= 129) {
            patientInfoCopy.systolicBloodPressure = patientInfoCopy.systolicBloodPressure - 10;
        }
        else if (patientInfoCopy.systolicBloodPressure >= 120 && patientInfoCopy.systolicBloodPressure <129) {
            patientInfoCopy.systolicBloodPressure = 119;
        }
        else if (patientInfoCopy.systolicBloodPressure >= 105 && patientInfoCopy.systolicBloodPressure < 120) {
            return undefined;
        }

        var score = CardiacRisk.computeRRS(patientInfoCopy);
        whatIfSBP.value = score + '%';
        whatIfSBP.valueText = patientInfoCopy.systolicBloodPressure + ' mm/Hg';
        return whatIfSBP;
    };
    CardiacRisk.computeWhatIfSBP = computeWhatIfSBP;

    /**
     * Computes RRS for a patient in a potential scenario of not being a smoker
     * @method computeWhatIfNotSmoker
     */
    var computeWhatIfNotSmoker = function () {
        var patientInfoCopy = $.extend(true, {}, CardiacRisk.patientInfo);
        patientInfoCopy.relatedFactors.smoker = false;
        return CardiacRisk.computeRRS(patientInfoCopy);
    };
    CardiacRisk.computeWhatIfNotSmoker = computeWhatIfNotSmoker;

    /**
     * Computes RRS for a patient with potentially optimal health levels
     * @method computeWhatIfOptimal
     */
    var computeWhatIfOptimal = function () {
        var patientInfoCopy = $.extend(true, {}, CardiacRisk.patientInfo);
        patientInfoCopy.hsCReactiveProtein = 0.5;
        patientInfoCopy.totalCholesterol = 160;
        patientInfoCopy.hdl = 60;
        patientInfoCopy.ldl = 100;
        patientInfoCopy.systolicBloodPressure = 119;
        patientInfoCopy.relatedFactors.smoker = false;
        patientInfoCopy.relatedFactors.familyHeartAttackHistory = false;
        return CardiacRisk.computeRRS(patientInfoCopy);
    };
    CardiacRisk.computeWhatIfOptimal = computeWhatIfOptimal;

    /**
     * Computes patients actions to be displayed to the user.
     * @method computePatientActions
     */
    var computePatientActions = function () {

        var patientActions = {};
        if (CardiacRisk.patientInfo.totalCholesterol <= 160 &&
            CardiacRisk.patientInfo.ldl < 100 &&
            CardiacRisk.patientInfo.hdl >=60) {

            patientActions.dietHeader = 'Continue to eat a healthy diet and exercise';
            patientActions.diet = 'A healthy diet and regular exercise can keep cholesterol ' +
            'levels optimal.';

            patientActions.doctorHeader = 'Talk to your doctor';
            patientActions.doctor = 'Discuss the need to follow up with your primary care provider to monitor your health';

            if (CardiacRisk.patientInfo.hsCReactiveProtein <= 0.5) {
                patientActions.retesting = 'Periodically retest your levels to continually monitor ' +
                'your health.';
            }
        }
        else if (CardiacRisk.patientInfo.totalCholesterol >= 160 ||
            CardiacRisk.patientInfo.ldl >= 130 ||
            CardiacRisk.patientInfo.hdl <=60) {

            patientActions.dietHeader = 'Improve your diet and exercise more';
            patientActions.diet = 'A better diet and regular exercise can drastically ' +
            'improve your cholesterol levels.';

            patientActions.doctorHeader = 'Talk to your doctor';
            patientActions.doctor = 'Discuss statins or other medications with your primary care ' +
            'provider that can help lower cholesterol.';

            if (CardiacRisk.patientInfo.hsCReactiveProtein >= 0.5) {
                patientActions.retesting = 'Retesting in 1 to 2 weeks can help exclude temporary ' +
                'spikes in your blood levels.';
            }
        }

        return patientActions;
    };
    CardiacRisk.computePatientActions = computePatientActions;

    /**
     *  Method to generate error message text by validating availability of lab values.
     *  Checks for :
     *      1. High Sensitivity C Reactive Protein value
     *      2. Total Cholesterol Value
     *      3. HDL
     * @returns {string} Error string based on the missing lab value.
     */
    var validateLabsForMissingValueErrors = function () {
        var errorText = '';
        if (isNaN(CardiacRisk.patientInfo.hsCReactiveProtein) || CardiacRisk.patientInfo.hsCReactiveProtein.length === 0 ||
            CardiacRisk.patientInfo.hsCReactiveProtein === undefined) {
            errorText = 'High sensitivity C-Reactive Protein is missing. Cardiac risk cannot be calculated without it.';
        }
        else if (isNaN(CardiacRisk.patientInfo.totalCholesterol) || CardiacRisk.patientInfo.totalCholesterol.length === 0 ||
            CardiacRisk.patientInfo.totalCholesterol === undefined) {
            errorText = 'Total Cholesterol is missing. Cardiac risk cannot be calculated without it.';
        }
        else if (isNaN(CardiacRisk.patientInfo.hdl) || CardiacRisk.patientInfo.hdl.length === 0 ||
            CardiacRisk.patientInfo.hdl === undefined) {
            errorText = 'HDL is missing. Cardiac risk cannot be calculated without it.';
        }
        return errorText;
    };
    PatientInfo.validateLabsForMissingValueErrors = validateLabsForMissingValueErrors;

    /**
     * Method to generate error message text by checking for value bounds.
     * Checks for :
     *      1. High Sensitivity C Reactive Protein value for bounds : 0.03 - 20
     *      2. Total Cholesterol Value for bounds : 140 - 401
     *      3. HDL for bounds : 30 - 150
     * @returns {string} Error string based on out of bounds lab values.
     */
    var validateLabsForOutOfBoundsValueErrors = function () {
        var errorText = '';
        if (CardiacRisk.patientInfo.hsCReactiveProtein < 0.03) {
            errorText = 'C-Reactive Protein levels are too low to return a cardiac risk score.';
        }
        else if (CardiacRisk.patientInfo.hsCReactiveProtein > 20) {
            errorText = 'C-Reactive Protein levels are too high to return a cardiac risk score.';
        }
        else if (CardiacRisk.patientInfo.totalCholesterol < 140) {
            errorText = 'Total Cholesterol levels are too low to return a cardiac risk score.';
        }
        else if (CardiacRisk.patientInfo.totalCholesterol > 401) {
            errorText = 'Total Cholesterol levels are too high to return a cardiac risk score.';
        }
        else if (CardiacRisk.patientInfo.hdl < 30) {
            errorText = 'HDL levels are too low to return a cardiac risk score.';
        }
        else if (CardiacRisk.patientInfo.hdl > 150) {
            errorText = 'HDL levels are too high to return a cardiac risk score.';
        }
        return errorText;
    };
    PatientInfo.validateLabsForOutOfBoundsValueErrors = validateLabsForOutOfBoundsValueErrors;

    /**
     * Builds the strings for display of whatIfOptimalValues based on the score.
     * @param score
     * @method buildWhatIfOptimalValues
     */
    var buildWhatIfOptimalValues = function (score) {

        var whatIfOptimalValues = {};
        whatIfOptimalValues.value = score + '%';

        if(CardiacRisk.patientInfo.relatedFactors.smoker === true && !CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.valueText = ' if you quit smoking and all levels were optimal';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false &&
            CardiacRisk.optimalLabs() &&
            CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory === true &&
            score > 5) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = 'Your risk is the lowest it can be based on the supplied information';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false &&
            CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = 'All levels are currently optimal';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false &&
            !CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.valueText = ' if all levels were optimal';
        }

        return whatIfOptimalValues;
    };
    CardiacRisk.buildWhatIfOptimalValues = buildWhatIfOptimalValues;

    /**
     * Builds the strings for display of whatIfNotSmoker based on the score.
     * @param score
     * @method buildWhatIfNotSmoker
     */
    var buildWhatIfNotSmoker = function (score) {
        var whatIfNotSmoker = {};
        whatIfNotSmoker.value = score + '%';
        return whatIfNotSmoker;
    };
    CardiacRisk.buildWhatIfNotSmoker = buildWhatIfNotSmoker;

    /**
     * Checks if the Cardiac Risk data model has sufficient data to compute the RRS.
     * Checks for :
     *    1. Systolic Blood Pressure
     *    2. Patients Smoking status
     *    3. Patients family heart attach history.
     * @returns {boolean} Indicating if RRS can be calculated.
     */
    var canCalculateCardiacRiskScore = function () {

        if (CardiacRisk.isValidSysBP(CardiacRisk.patientInfo.systolicBloodPressure) &&
            CardiacRisk.patientInfo.relatedFactors.smoker !== undefined &&
            CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory !== undefined) {
            return true;
        }
        return false;

    };
    CardiacRisk.canCalculateCardiacRiskScore = canCalculateCardiacRiskScore;

    /**
     * Validates the provided systolic blood pressure value for bounds and availability.
     * @param currentSysBP : User seen value for systolic blood pressure.
     * @returns {boolean} Indicates if the systolic blood pressure value is usable.
     */
    var isValidSysBP = function (currentSysBP) {

        if (!isNaN(currentSysBP) && currentSysBP !== undefined && currentSysBP >=105 && currentSysBP <=200) {
            return true;
        }
        return false;

    };
    CardiacRisk.isValidSysBP = isValidSysBP;

    /**
     * Computes if the lab values are optimal and returns a boolean.
     * @returns {boolean}
     * @method optimalLabs
     */
    var optimalLabs = function () {
        var optimal = false;
        if (CardiacRisk.patientInfo.hsCReactiveProtein === 0.5 &&
            CardiacRisk.patientInfo.totalCholesterol === 160 &&
            CardiacRisk.patientInfo.hdl === 60 &&
            CardiacRisk.patientInfo.ldl === 100) {
            optimal = true;
        }
        return optimal;
    };
    CardiacRisk.optimalLabs = optimalLabs;

    /**
     * Computes if the object is valid considering its structure.
     * This method is specific to verify if valueQuantity is in the structure.
     * @param obj
     * @returns {boolean}
     */
    var isValidValueQuantityObject = function (obj){
        if (typeof obj !== undefined && obj.length > 0) {
            if (obj[0].hasOwnProperty('valueQuantity') && obj[0].valueQuantity.units !== undefined) {
                return true;
            }
        }
        return false;
    };
    CardiacRisk.isValidValueQuantityObject = isValidValueQuantityObject;

    /**
     * Validates the CardiacRisk model properties for the required values to compute RRS. If values are missing, an error
     * string is generated as a response.
     * @returns {string} Error string indicating problem with the model data availability.
     * @method validateModelForErrors
     */
    var validateModelForErrors = function () {
        var errorText = '';
        if (CardiacRisk.patientInfo.age < 45 || CardiacRisk.patientInfo.age > 80) {
            errorText = 'Cardiac risk can only be calculated for patients aged 45-80 years old.';
        }
        else if (!(CardiacRisk.patientInfo.gender.toLowerCase() === 'male' || CardiacRisk.patientInfo.gender.toLowerCase() === 'female')) {
            errorText = 'Cardiac Risk Score cannot be calculated for indeterminate gender.';
        }
        if (errorText.length === 0) {
            errorText = CardiacRisk.patientInfo.validateLabsForMissingValueErrors();
        }
        if (errorText.length === 0) {
            errorText = CardiacRisk.patientInfo.validateLabsForOutOfBoundsValueErrors();
        }
        return errorText;
    };
    CardiacRisk.validateModelForErrors = validateModelForErrors;

    // Visibility for testing purposes w/ window
    window.CardiacRisk = CardiacRisk;
    window.CardiacRisk.patientInfo = PatientInfo;
    CardiacRisk._window = window;
}(this));


