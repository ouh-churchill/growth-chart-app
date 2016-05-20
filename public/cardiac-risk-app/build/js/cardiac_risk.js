(function (window, undefined) {

    'use strict';

    var CardiacRisk = {};
    var PatientInfo = {};

    CardiacRisk.colorClasses = {
        lowRisk: 'backgroundColorLowRisk',
        lowModerateRisk: 'backgroundColorLowModerateRisk',
        moderateRisk: 'backgroundColorModerateRisk',
        highRisk: 'backgroundColorHighRisk',
        rangeSliderThumbWhiteText: 'rangeSliderThumbStyleWhite',
        grayBarColor: 'colorGray'
    };

    /**
     * Loads patient's FHIR data and updates the CardiacRisk data model.
     * Fetches patient context to get basic patient info and observations to get lab results based on the
     * supplied LOINC codes.
     * LOINC Codes used : 'http://loinc.org|30522-7', 'http://loinc.org|14647-2', 'http://loinc.org|2093-3',
     * 'http://loinc.org|2085-9', 'http://loinc.org|8480-6', 'http://loinc.org|2089-1', 'http://loinc.org|13457-7'
     * @method fetchDataAndPopulateCardiacRiskObject
     */
    var fetchDataAndPopulateCardiacRiskObject = function () {

        //Setting this flag to indicate the system, to display the first error screen triggered.
        //This flag gets set to false once the error screen has been displayed to stop further UI updates.
        CardiacRisk.shouldProcessError = true;

        var deferred = $.Deferred();
        FHIR.oauth2.ready(onReady,onError);
        function onReady(smart) {
            CardiacRisk.hideDemographicsBanner = (smart.tokenResponse.need_patient_banner === false);

            // Calculating date 1 year in the past from the day the application is ran. Its used to fetch labs as
            // far as 1 year in past.
            var currentDate = new Date();
            var dateInPast = new Date();
            dateInPast.setFullYear( currentDate.getFullYear() - 1 );

            var patientQuery = smart.context.patient.read();
            patientQuery.fail((function () {
                processError('There was an error loading the application.');
                Canadarm.error('Patient resource failure while loading cardiac risk app.');
            }));
            patientQuery.done(function () {
                var labsQuery = smart.context.patient.Observation.where
                    .codeIn('http://loinc.org|2089-1', 'http://loinc.org|13457-7',
                    'http://loinc.org|30522-7', 'http://loinc.org|14647-2',
                    'http://loinc.org|2093-3', 'http://loinc.org|2085-9', 'http://loinc.org|8480-6')
                    .date('>=' + dateInPast.toJSON())
                    .search();

                $.when(patientQuery, labsQuery)
                    .done(function (patientData, labResults) {

                        PatientInfo.firstName = patientData.name[0].given.join(' ');
                        PatientInfo.lastName = patientData.name[0].family.join(' ');
                        PatientInfo.gender = patientData.gender;
                        PatientInfo.dateOfBirth = new Date(patientData.birthDate);
                        PatientInfo.age = CardiacRisk.computeAgeFromBirthDate(PatientInfo.dateOfBirth);

                        CardiacRisk.patientInfo = PatientInfo;

                        var relatedFactors = {};
                        /* Default to undefined since we want to remove error state on radio buttons on the first go */
                        relatedFactors.smoker = undefined;
                        relatedFactors.familyHeartAttackHistory = undefined;
                        CardiacRisk.patientInfo.relatedFactors = relatedFactors;

                        CardiacRisk.processLabsData(deferred, smart, labResults, function (deferred) {
                            if (CardiacRisk.isRequiredLabsNotAvailable()) {
                                var codeText = '';

                                if (CardiacRisk.hasObservationWithUnsupportedUnits) {
                                    processError('One or more results has an unsupported unit of measure. ' +
                                    'Cardiac Risk cannot be calculated.');

                                    if (CardiacRisk.unsupportedUnitDataPoint.hasOwnProperty('code')) {
                                        codeText = CardiacRisk.unsupportedUnitDataPoint.code.text;
                                    }
                                    Canadarm.error('Unsupported unit of measure, observation :', undefined, {
                                        'status' : CardiacRisk.unsupportedUnitDataPoint.status,
                                        'value' : CardiacRisk.unsupportedUnitDataPoint.valueQuantity.value,
                                        'unit' : CardiacRisk.unsupportedUnitDataPoint.valueQuantity.units,
                                        'valueString' : CardiacRisk.unsupportedUnitDataPoint.valueString,
                                        'codeText' : codeText
                                    });
                                }
                                else if (CardiacRisk.unsupportedObservationStructureDataPoint) {
                                    var logValue = '';
                                    var logUnits = '';
                                    if (CardiacRisk.unsupportedObservationStructureDataPoint.hasOwnProperty('code')) {
                                        codeText = CardiacRisk.unsupportedObservationStructureDataPoint.code.text;
                                    }
                                    if (CardiacRisk.unsupportedObservationStructureDataPoint.hasOwnProperty('valueQuantity')) {
                                        logValue = CardiacRisk.unsupportedObservationStructureDataPoint.valueQuantity.value;
                                        logUnits = CardiacRisk.unsupportedObservationStructureDataPoint.valueQuantity.units;
                                    }
                                    Canadarm.error('Unsupported observation structure, observation :', undefined, {
                                        'status' : CardiacRisk.unsupportedObservationStructureDataPoint.status,
                                        'value' : logValue,
                                        'unit' : logUnits,
                                        'valueString' : CardiacRisk.unsupportedObservationStructureDataPoint.valueString,
                                        'codeText' : codeText
                                    });
                                }
                            }
                            deferred.resolve();
                        });
                    })
                    .fail(function () {
                        processError('There was an error loading the application.');
                        Canadarm.error('Observations resource failed.');
                    });
            });
        }
        function onError() {
            processError('There was an error loading the application.');
            Canadarm.error('Authorization error while loading cardiac risk app.');
            deferred.reject();
        }
        return deferred.promise();
    };
    CardiacRisk.fetchDataAndPopulateCardiacRiskObject = fetchDataAndPopulateCardiacRiskObject;

    /**
     * Processes labs fetched. Fetches subsequent available pages until we have values for all the labs.
     * @param deferred : Deferred object passed in to return in the callback function.
     * @param smart : smart object to do further processing using the fhir-client functions.
     * @param labResults : array of labs and information to fetch next page of observations
     * @param callBackFunction : function to callback once the execution is done.
     */
    var processLabsData = function (deferred, smart, labResults, callBackFunction) {
        CardiacRisk.hasObservationWithUnsupportedUnits = false;
        var callBackArgs = {
            'deferred' : deferred,
            'smart' : smart,
            'nextPageObj' : labResults[1],
            'callBackFunction' : callBackFunction
        };
        CardiacRisk.processLabResultsPageData(callBackArgs , labResults[0], function (callBackArgs) {
            callBackArgs.callBackFunction(callBackArgs.deferred);
        });
    };
    CardiacRisk.processLabsData = processLabsData;

    /**
     * Processes the data returned by subsequent pages from the observations resource
     * @param callBackArgs : An object containing callBackFunction and required parameters to complete the callBack.
     * @param labResults : Array of observations returned by the observations service
     * @param mainCallBack : Callback function to be invoked after all pages are fetched.
     */
    var processLabResultsPageData = function (callBackArgs, labResults, mainCallBack) {

        var loincCodes = callBackArgs.smart.byCodes(labResults, 'code');

        if (CardiacRisk.patientInfo.hsCReactiveProtein === undefined) {
            CardiacRisk.patientInfo.hsCReactiveProtein = CardiacRisk.getHSCRPValue(loincCodes('30522-7'));
        }
        if (CardiacRisk.patientInfo.totalCholesterol === undefined) {
            CardiacRisk.patientInfo.totalCholesterol = CardiacRisk.getCholesterolValue(loincCodes('14647-2', '2093-3'));
        }
        if (CardiacRisk.patientInfo.hdl === undefined) {
            CardiacRisk.patientInfo.hdl = CardiacRisk.getCholesterolValue(loincCodes('2085-9'));
        }
        if (CardiacRisk.patientInfo.ldlDirect === undefined) {
            CardiacRisk.patientInfo.ldlDirect = CardiacRisk.getCholesterolValue(loincCodes('2089-1'));
        }
        if (CardiacRisk.patientInfo.ldlCalculated === undefined) {
            CardiacRisk.patientInfo.ldlCalculated = CardiacRisk.getCholesterolValue(loincCodes('13457-7'));
        }
        if (CardiacRisk.patientInfo.systolicBloodPressure === undefined) {
            CardiacRisk.patientInfo.systolicBloodPressure = CardiacRisk.getSystolicBloodPressureValue(loincCodes('8480-6'));
        }

        //We need to look for ldlDirect before we consider ldlCalculated value for ldl.
        if (CardiacRisk.patientInfo.ldl === undefined) {
            CardiacRisk.patientInfo.ldl = CardiacRisk.patientInfo.ldlDirect;
        }

        if (typeof callBackArgs.nextPageObj.hasNext == 'function') {
            if (CardiacRisk.isLabsNotAvailable() && callBackArgs.nextPageObj.hasNext()) {
                CardiacRisk.getLabsNextPage(callBackArgs, mainCallBack, function (callBackArgs, labResultsNextPage, mainCallBack) {
                    CardiacRisk.processLabResultsPageData(callBackArgs, labResultsNextPage, mainCallBack);
                });
            }
            else {
                if (CardiacRisk.patientInfo.ldl === undefined) {
                    CardiacRisk.patientInfo.ldl = CardiacRisk.patientInfo.ldlCalculated;
                }
                mainCallBack(callBackArgs);
            }
        }
    };
    CardiacRisk.processLabResultsPageData = processLabResultsPageData;

    /**
     * Fetches the next available observations page from the observations service.
     * @param callBackArgs : An object containing callBackFunction and required parameters to complete the callBack.
     * @param mainCallBack : Callback function for the to be held on to inbetween subsequent service calls.
     * @param callBackFunction : Callback function in the recursive loop to invoke when success.
     */
    var getLabsNextPage = function (callBackArgs, mainCallBack, callBackFunction) {
        callBackArgs.nextPageObj.next()
            .done(function (labResultsNextPage) {
                callBackFunction(callBackArgs, labResultsNextPage, mainCallBack);
            })
            .fail(function () {
                processError('There was an error loading the application.');
                Canadarm.error('Failed to fetch additional observations resource pages.');
            });
    };
    CardiacRisk.getLabsNextPage = getLabsNextPage;

    /**
     * Sorting function to sort observations based on the time stamp returned. Sorting is done to get most recent date first.
     * @param labsToSort : Array of observations to sort
     * @returns labsToSort : Returns the sorted array.
     */
    var sortObservationsByAppliesTimeStamp = function (labsToSort) {
        labsToSort.sort(function (a,b) {
            return Date.parse(b.appliesDateTime) - Date.parse(a.appliesDateTime);
        });
        return labsToSort;
    };
    CardiacRisk.sortObservationsByAppliesTimeStamp = sortObservationsByAppliesTimeStamp;

    /**
     * Fetches current cholesterol into units of mg/dL
     * @method getCholesterolValue
     * @param {object} cholesterolObservations - Cholesterol array object with valueQuantity elements having units and value.
     */
    var getCholesterolValue = function (cholesterolObservations) {
        return CardiacRisk.getFirstValidDataPointValueFromObservations(cholesterolObservations, function (dataPoint) {
            if (dataPoint.valueQuantity.units === 'mg/dL') {
                return parseFloat(dataPoint.valueQuantity.value);
            }
            else if (dataPoint.valueQuantity.units === 'mmol/L') {
                return parseFloat(dataPoint.valueQuantity.value) / 0.026;
            }
            else {
                return undefined;
            }
        });
    };
    CardiacRisk.getCholesterolValue = getCholesterolValue;

    /**
     * Fetches current high sensitivity C-reactive protein into value in mg/L
     * @method getHSCRPValue
     * @param {object} hsCRPObservations - hscrp array object with valueQuantity elements having units and value.
     */
    var getHSCRPValue = function (hsCRPObservations) {
        return CardiacRisk.getFirstValidDataPointValueFromObservations(hsCRPObservations, function (dataPoint) {
            if (dataPoint.valueQuantity.units === 'mg/L') {
                return parseFloat(dataPoint.valueQuantity.value);
            }
            else if (dataPoint.valueQuantity.units === 'mmol/L') {
                return parseFloat(dataPoint.valueQuantity.value) / 0.10;
            }
            else {
                return undefined;
            }
        });
    };
    CardiacRisk.getHSCRPValue = getHSCRPValue;

    /**
     * Fetches current Systolic Blood Pressure
     * @method getSystolicBloodPressureValue
     * @param {object} sysBPObservations - sysBloodPressure array object with valueQuantity elements having units and value.
     */
    var getSystolicBloodPressureValue = function (sysBPObservations) {
        return CardiacRisk.getFirstValidDataPointValueFromObservations(sysBPObservations, function (dataPoint) {
            if (dataPoint.valueQuantity.units === 'mmHg') {
                return parseFloat(dataPoint.valueQuantity.value);
            }
            else {
                return undefined;
            }
        });
    };
    CardiacRisk.getSystolicBloodPressureValue = getSystolicBloodPressureValue;

    /**
     * Fetches the most recent valid dataPointValue from the observations .
     * Validity criteria :
     * 1. status : 'final' or 'amended'
     * 2. availability of the valueQuantity field having value and units
     * 3. units are supported.
     * The method also sets a flag on the Cardiac Risk model about an observation with an unsupported unit.
     * @param observations : Array of observations to be used to find the valid dataPoint
     * @param supportedUnitsCriteria : Criteria function supplied to be used for every dataPoint.
     * @returns dataPointValue : Single observation value which meets the criteria. If no dataPointValue is valid then
     * undefined is returned to fetch further more results.
     */
    var getFirstValidDataPointValueFromObservations = function (observations, supportedUnitsCriteria) {
        var dataPoints = CardiacRisk.sortObservationsByAppliesTimeStamp(observations);
        for (var i = 0; i < dataPoints.length; i++) {

            if ((dataPoints[i].status === 'final' || dataPoints[i].status === 'amended') &&
                dataPoints[i].hasOwnProperty('valueQuantity') && dataPoints[i].valueQuantity.value &&
                dataPoints[i].valueQuantity.units) {

                var dataPointValue = supportedUnitsCriteria(dataPoints[i]);
                if (dataPointValue !== undefined) {
                    return dataPointValue;
                }

                // We set this flag here to process later ( once all pages have been scanned for a valid dataPoint),
                // to convey to the user about unsupported units.
                CardiacRisk.hasObservationWithUnsupportedUnits = true;
                CardiacRisk.unsupportedUnitDataPoint = dataPoints[i];
            }
            else
            {
                // We collect this information to log incase if the user doesnt have a required unit.
                CardiacRisk.unsupportedObservationStructureDataPoint = dataPoints[i];
            }
        }
        return undefined;
    };
    CardiacRisk.getFirstValidDataPointValueFromObservations = getFirstValidDataPointValueFromObservations;

    /**
     * Method to calculate age from the provided date of birth considering leapYear.
     * @param birthDate - Date of birth in Date Object format.
     * @returns {number} - Age of the person.
     */
    var computeAgeFromBirthDate = function (birthDate) {
        function isLeapYear(year) {
            return new Date(year, 1, 29).getMonth() == 1;
        }

        if (Object.prototype.toString.call(birthDate) === '[object Date]' && !isNaN(birthDate.getTime())) {
            var now = new Date();
            var years = now.getFullYear() - birthDate.getFullYear();
            birthDate.setFullYear(birthDate.getFullYear() + years);
            if (birthDate > now) {
                years--;
                birthDate.setFullYear(birthDate.getFullYear() - 1);
            }
            var days = (now.getTime() - birthDate.getTime()) / (3600 * 24 * 1000);
            return Math.floor(years + days / (isLeapYear(now.getFullYear()) ? 366 : 365));
        }
        else {
            return undefined;
        }
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
        whatIfSBP.score = score;
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
            CardiacRisk.patientInfo.hdl >= 60) {

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
            CardiacRisk.patientInfo.hdl <= 60) {

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
            errorText = 'Cardiac Risk cannot be calculated without a valid value for High sensitivity C-Reactive Protein.';
        }
        else if (isNaN(CardiacRisk.patientInfo.totalCholesterol) || CardiacRisk.patientInfo.totalCholesterol.length === 0 ||
            CardiacRisk.patientInfo.totalCholesterol === undefined) {
            errorText = 'Cardiac Risk cannot be calculated without a valid value for Total Cholesterol.';
        }
        else if (isNaN(CardiacRisk.patientInfo.hdl) || CardiacRisk.patientInfo.hdl.length === 0 ||
            CardiacRisk.patientInfo.hdl === undefined) {
            errorText = 'Cardiac Risk cannot be calculated without a valid value for HDL.';
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
            !CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.valueText = ' if all levels were optimal';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === true && CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = '';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false &&
            CardiacRisk.optimalLabs() &&
            CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory === true &&
            score >= 5) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = 'Your risk is the lowest it can be based on the supplied information';
        }
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false && CardiacRisk.optimalLabs()) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = 'All levels are currently optimal';
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
     * Checks if the Cardiac Risk data model has all the labs available. This is used to verify is the service returned
     * atleast 1 value per lab.
     * @returns {boolean} : Indicating if all labs are available.
     */
    var isLabsNotAvailable = function () {
        if (CardiacRisk.patientInfo.hsCReactiveProtein === undefined ||
            CardiacRisk.patientInfo.totalCholesterol === undefined ||
            CardiacRisk.patientInfo.hdl === undefined ||
            CardiacRisk.patientInfo.ldl === undefined ||
            CardiacRisk.patientInfo.systolicBloodPressure === undefined) {
            return true;
        }
        return false;
    };
    CardiacRisk.isLabsNotAvailable = isLabsNotAvailable;

    /**
     * Checks if the Cardiac Risk data model has the required labs available. This check excludes systolic BP since
     * the user can enter this value using the UI.
     * @returns {boolean} : Indicating if required labs are available.
     */
    var isRequiredLabsNotAvailable = function () {
        if (CardiacRisk.patientInfo.hsCReactiveProtein === undefined ||
            CardiacRisk.patientInfo.totalCholesterol === undefined ||
            CardiacRisk.patientInfo.hdl === undefined) {
            return true;
        }
        return false;
    };
    CardiacRisk.isRequiredLabsNotAvailable = isRequiredLabsNotAvailable;

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
        if (CardiacRisk.patientInfo.hsCReactiveProtein >= 0.03 &&
            CardiacRisk.patientInfo.hsCReactiveProtein <= 0.9 &&
            CardiacRisk.patientInfo.totalCholesterol >= 140 &&
            CardiacRisk.patientInfo.totalCholesterol <= 199 &&
            CardiacRisk.patientInfo.hdl >= 60 &&
            CardiacRisk.patientInfo.hdl <= 150 &&
            CardiacRisk.patientInfo.ldl >= 50 &&
            CardiacRisk.patientInfo.ldl <= 100) {
            optimal = true;
        }
        return optimal;
    };
    CardiacRisk.optimalLabs = optimalLabs;

    /**
     * Validates the CardiacRisk model properties for the required values to compute RRS. If values are missing, an error
     * string is generated as a response.
     * @returns {string} Error string indicating problem with the model data availability.
     * @method validateModelForErrors
     */
    var validateModelForErrors = function () {
        var errorText = '';
        if (CardiacRisk.patientInfo.age === undefined || CardiacRisk.patientInfo.age < 45 || CardiacRisk.patientInfo.age > 80) {
            errorText = 'Cardiac risk can only be calculated for patients aged 45-80 years old.';
        }
        else if (CardiacRisk.patientInfo.gender === undefined ||
            !(CardiacRisk.patientInfo.gender.toLowerCase() === 'male' ||
            CardiacRisk.patientInfo.gender.toLowerCase() === 'female')) {
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

/**
 * Function to perform initial setup for the application.
 */
function initialSetup() {
  initalizeLogging();
  $(window).resize(function () {
    adjustRelatedFactorsSize();

    var $leftContentBox = $('.contentBoxLeft');
    if ($leftContentBox.width() < 490 && $leftContentBox.width() > 377) {
      adjustRangeSliderThumbPosition();
    }
  });
}

/**
 * Function to initialize Canadarm logging for the application.
 */
function initalizeLogging() {
  Canadarm.init({
    onError: false,  // Set to false if you do not want window.onerror set.
    wrapEvents: false, // Set to false if you do not want all event handlers to be logged for errors
    logLevel: Canadarm.level.INFO, // Will only send logs for level of INFO and above.
    appenders: [
      Canadarm.Appender.standardLogAppender
    ],
    handlers: [
      Canadarm.Handler.beaconLogHandler(config.canadarm_beacon_url),
      Canadarm.Handler.consoleLogHandler
    ]
  });
}

/**
 * Function to ready UI for the application.
 */
CardiacRisk.fetchDataAndPopulateCardiacRiskObject().then(function () {
  //Hide or Show Patient Demographics banner.
  if (CardiacRisk.hideDemographicsBanner) {
    $('#patientDemographics').addClass('contentHidden');
  }
  else {
    $('#patientDemographics').removeClass('contentHidden');
    updatePatientDemographicsBanner();
  }

  if (validData()) {
    //Since service call has succeeded we hide the loading indicator and enable the content.
    $('#pageLoading').removeClass().addClass('contentHidden');
    $('#pageContent').removeClass().addClass('contentLayout');
    updatePatientActions();
    checkForIncompleteState();
    createRangeSliderGraphs();
    addEventListeners();
    adjustRelatedFactorsSize();
  }
  else {
    return;
  }
});

/**
 * Updates the patient demographics banner with data from the model.
 */
function updatePatientDemographicsBanner() {
  $('#patientName').text(CardiacRisk.patientInfo.firstName + ' ' + CardiacRisk.patientInfo.lastName);
  var ageString = ' yrs';
  if (CardiacRisk.patientInfo.age) {
    ageString = CardiacRisk.patientInfo.age + ageString;
  }
  $('#patientAge').text(ageString);
  if (CardiacRisk.patientInfo.gender === 'male') {
    $('#patientGender').text('M');
  }
  else if (CardiacRisk.patientInfo.gender === 'female') {
    $('#patientGender').text('F');
  }
  var date = CardiacRisk.patientInfo.dateOfBirth;
  var dobString = '';
  if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
    dobString = date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
  }
  $('#patientDOB').text(dobString);
}

/**
 * Updates the patient actions section based on the available lab values.
 */
function updatePatientActions() {
  var patientActions = CardiacRisk.computePatientActions();
  $('#contentDietExerciseHeader').text(patientActions.dietHeader);
  $('#contentDietExercise').text(patientActions.diet);
  $('#contentDoctorHeader').text(patientActions.doctorHeader);
  $('#contentDoctor').text(patientActions.doctor);
  $('#contentRetesting').text(patientActions.retesting);
}

/**
 * Checks for the validity of available parameters to calculate the RRS.
 * This method will display an Incomplete state UI at the beginning of the app since the availability of
 * patients related factors is unknown.
 */
function checkForIncompleteState() {
  if (!CardiacRisk.canCalculateCardiacRiskScore()) {
    $('#resultsInfo').removeClass('contentHidden');
    $('#resultsSliders').removeClass('contentHidden');
    $('#riskBar').removeClass().addClass('riskBarIncomplete');
    $('#riskMessage').text('Incomplete');
    $('#riskDescriptionText').text('Related factors must be completed in order to calculate your cardiac risk score.');
    $('#riskDescriptionValue').text('');
    $('#containerPatientActions').removeClass().addClass('contentHiddenVisibility');
    $('#whatIfContainer').removeClass().addClass('contentHidden');
    $('#horizontalRule').removeClass().addClass('contentHidden');
  }
  else
  {
    $('#sbpInput').val(CardiacRisk.patientInfo.systolicBloodPressure);
  }
}

/**
 * This method validates the available data gathered from the service response.
 * This method also updates the UI with errors discovered in the form of Error Messages.
 * Looks for :
 *    1. Age between 45 - 80 range
 *    2. Gender 'male' or 'female' any other value is considered as indeterminate gender and an error is displayed.
 *    3. Looks for missingLabValues
 *    4. Looks for outOfBoundsValues
 * @returns {boolean} Indicating if the data is valid for the UI to be loaded.
 */
function validData() {
  var errorText = CardiacRisk.validateModelForErrors();
  if (errorText.length > 0) {
    processError(errorText);
    return false;
  }
  return true;
}

/**
 * This method updates the UI to display an error with the received text.
 * @param errorText
 */
function processError(errorText) {
  if (CardiacRisk.shouldProcessError) {
    CardiacRisk.shouldProcessError = false;
    $('#pageLoading').removeClass().addClass('contentHidden');
    $('#pageError').removeClass().addClass('contentErrorLayout');
    $('#pageContent').removeClass().addClass('contentHidden');
    $('#pageErrorLabel').text(errorText);
  }
}

/**
 * This method updates the UI components.
 */
function updateUI() {
  $('#containerPatientActions').removeClass().addClass('patientActions');
  $('#whatIfContainer').removeClass().addClass('whatIfContainerLayout');
  $('#horizontalRule').removeClass().addClass('hrStyle');

  updateUICardiacRiskScore();
  updateUIWhatIfSystolicBloodPressure();
  updateUIWhatIfNotSmoker();
  updateUIWhatIfOptimalValues();
  updateUIWhatIfContainer();
  adjustRelatedFactorsSize();
}

/**
 * Add event listeners to the UI once the dom is ready.
 */
function addEventListeners() {
  $('#sbpInput').keypress(function(event) {return isNumberKey(event);});
  $('#sbpInput').on('focusout', sbpInputFocusOutHandler);
  $('[name="smoker"]').change(onSmokerInput);
  $('[name="familyHeartAttackHistory"]').change(onFamilyHistoryInput);
}

/**
 * Event listener method for systolic blood pressure input box.
 * This method will check for :
 *    1. valid systolic blood pressure value
 *    2. update the CardiacRisk data model
 *    3. update UI if the RRS can be calculated.
 */
function onSBPInput() {
  var systolicBPValue = document.getElementById('sbpInput').value;
  if (CardiacRisk.isValidSysBP(systolicBPValue))
  {
    // Save the user viewed blood pressure value in our dataObject for future references.
    CardiacRisk.patientInfo.systolicBloodPressure = systolicBPValue;
    $('#legendSysBPError').removeClass().addClass('relatedFactorsErrorsHidden');
    $('#asteriskSBP').removeClass().addClass('contentHidden');
    $('#sbpInput').val(systolicBPValue);

    if (CardiacRisk.canCalculateCardiacRiskScore()) {
      updateUI();
    }
  }
  else if (CardiacRisk.patientInfo.systolicBloodPressure !== undefined) {
    $('#sbpInput').val(CardiacRisk.patientInfo.systolicBloodPressure);
  }
  else if (CardiacRisk.patientInfo.systolicBloodPressure === undefined) {
    $('#legendSysBPError').removeClass().addClass('relatedFactorsErrors');
    $('#asteriskSBP').removeClass().addClass('asterisk');
  }
}

/**
 * Event listener method for the smoker status radio button value change.
 */
function onSmokerInput() {
  if (CardiacRisk.patientInfo.relatedFactors.smoker === undefined) {
    $('#legendSmokerError').toggleClass('relatedFactorsErrors relatedFactorsErrorsHidden');
    $('#asteriskSmoker').removeClass().addClass('contentHidden');
  }

  if ($(this).val() === 'yes') {
    // Save the user viewed smoker condition value in our dataObject for future references.
    CardiacRisk.patientInfo.relatedFactors.smoker = true;
    $('#contentSmokingHeader').text('Quit smoking');
    $('#contentSmoking').text('By stopping smoking, you can drastically decrease your ' +
    'heart disease risk!');
  } else {
    // Save the user viewed smoker condition value in our dataObject for future references.
    CardiacRisk.patientInfo.relatedFactors.smoker = false;
    $('#whatIfNotSmoker').addClass('contentHidden');

    $('#contentSmokingHeader').text('Stay smoke free');
    $('#contentSmoking').text('By not smoking, you are keeping your ' +
    'heart disease risk low!');
  }

  if (CardiacRisk.canCalculateCardiacRiskScore()) {
    updateUI();
  }
}

/**
 * Event listener method for the family heart attach history status radio button value change.
 */
function onFamilyHistoryInput() {
  if (CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory === undefined) {
    $('#legendFamilyHistoryError').toggleClass('relatedFactorsErrors relatedFactorsErrorsHidden');
    $('#asteriskFamilyHistory').removeClass().addClass('contentHidden');
  }

  if ($(this).val() === 'yes') {
    CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory = true;
  } else {
    CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory = false;
  }

  if (CardiacRisk.canCalculateCardiacRiskScore()) {
    updateUI();
  }
}

/**
 * Method to update the UI for cardiac risk score based on the RRS calculation.
 * Updates components:
 *    1. Risk Description
 *    2. Risk Bar
 */
function updateUICardiacRiskScore() {
  var score = CardiacRisk.computeRRS(CardiacRisk.patientInfo);
  CardiacRisk.currentCardiacRiskScore = score;
  $('#riskDescriptionText').text('Your chance of having a heart attack, stroke, or other ' +
  'heart disease event at some point in the next 10 years is ');
  $('#riskDescriptionValue').text(score + '%');

  var $riskBar = $('#riskBar');
  var $riskMessage = $('#riskMessage');
  if (score < 5) {
    $riskBar.removeClass().addClass('riskBarLowRisk');
    $riskMessage.text('Low Risk');
  } else if (score >= 5 && score < 10) {
    $riskBar.removeClass().addClass('riskBarLowModerateRisk');
    $riskMessage.text('Low-Moderate Risk');
  } else if (score >= 10 && score < 20) {
    $riskBar.removeClass().addClass('riskBarModerateRisk');
    $riskMessage.text('Moderate Risk');
  } else if (score >= 20) {
    $riskBar.removeClass().addClass('riskBarHighRisk');
    $riskMessage.text('High Risk');
  }
}

/**
 * Method to update UI based on the related factors form input.
 */
function updateUIWhatIfSystolicBloodPressure() {
  var whatIfSBPResponse = CardiacRisk.computeWhatIfSBP();
  if (whatIfSBPResponse === undefined || whatIfSBPResponse.score >= CardiacRisk.currentCardiacRiskScore) {
    $('#whatIfSBP').addClass('contentHidden');
  }
  else {
    $('#whatIfSBP').removeClass('contentHidden');
    $('#whatIfSBPValue').text(whatIfSBPResponse.value);
    $('#whatIfSBPValueText').text(whatIfSBPResponse.valueText);
  }
}

/**
 * Method to update UI based on the related factors form input.
 */
function updateUIWhatIfNotSmoker() {
  var whatIfNotSmokerScore = CardiacRisk.computeWhatIfNotSmoker();
  if (whatIfNotSmokerScore === undefined || CardiacRisk.patientInfo.relatedFactors.smoker === false || whatIfNotSmokerScore >= CardiacRisk.currentCardiacRiskScore) {
    $('#whatIfNotSmoker').addClass('contentHidden');
  }
  else {
      var whatIfNotSmoker = CardiacRisk.buildWhatIfNotSmoker(whatIfNotSmokerScore);
      $('#whatIfNotSmoker').removeClass('contentHidden');
      $('#whatIfNoSmokerValue').text(whatIfNotSmoker.value);
  }
}

/**
 * Method to update UI based on the related factors form input.
 */
function updateUIWhatIfOptimalValues() {
  var whatIfOptimalScore = CardiacRisk.computeWhatIfOptimal();
  if (whatIfOptimalScore === undefined || whatIfOptimalScore >= CardiacRisk.currentCardiacRiskScore) {
    $('#whatIfOptimal').addClass('contentHidden');
  }
  else
  {
    var whatIfOptimalValues = CardiacRisk.buildWhatIfOptimalValues(whatIfOptimalScore);
    $('#whatIfOptimal').removeClass('contentHidden');
    $('#whatIfOptimalValue').text(whatIfOptimalValues.value);
    $('#whatIfOptimalValueText').text(whatIfOptimalValues.valueText);
  }
}

function updateUIWhatIfContainer() {
  if ($('#whatIfSBP').hasClass('contentHidden') && $('#whatIfNotSmoker').hasClass('contentHidden') && $('#whatIfOptimal').hasClass('contentHidden')) {
    $('#whatIfContainer').addClass('contentHidden');
  }
  else
  {
    $('#whatIfContainer').removeClass('contentHidden');
  }
}

/**
 * Method to create the graphs for Lab values.
 */
function createRangeSliderGraphs() {
  buildRangeSliderDataModel();
  createCRPSlider();
  createCholesterolSlider();
  createLDLSlider();
  createHDLSlider();
}

/**
 * Method to create the C Reactive Protein slider based on the hsCReactiveProtein value from the
 * Cardiac Risk data model.
 */
function createCRPSlider() {
  var thumbDisplayText = '', thumbBackgroundColor = '', thumbTextColor = '';
  if (CardiacRisk.patientInfo.hsCReactiveProtein < 1) {
    thumbDisplayText = CardiacRisk.graphData.crpSliderData.toolTipData.keys[0];
    thumbBackgroundColor = CardiacRisk.colorClasses.lowRisk;
  }
  else if (CardiacRisk.patientInfo.hsCReactiveProtein >= 1 && CardiacRisk.patientInfo.hsCReactiveProtein <= 3) {
    thumbDisplayText = CardiacRisk.graphData.crpSliderData.toolTipData.keys[1];
    thumbBackgroundColor = CardiacRisk.colorClasses.moderateRisk;
  }
  else if (CardiacRisk.patientInfo.hsCReactiveProtein > 3) {
    thumbDisplayText = CardiacRisk.graphData.crpSliderData.toolTipData.keys[2];
    thumbBackgroundColor = CardiacRisk.colorClasses.highRisk;
    thumbTextColor = CardiacRisk.colorClasses.rangeSliderThumbWhiteText;
  }

  CardiacRisk.graphData.crpSliderData.thumbDisplayText = thumbDisplayText;
  CardiacRisk.graphData.crpSliderData.value = CardiacRisk.patientInfo.hsCReactiveProtein;
  generateRangeSlider(CardiacRisk.graphData.crpSliderData);
  changeBarBackgroundColor(CardiacRisk.graphData.crpSliderData.id, CardiacRisk.colorClasses.grayBarColor);

  changeThumbBackgroundColor(CardiacRisk.graphData.crpSliderData.id, thumbBackgroundColor);
  changeThumbTextColor(CardiacRisk.graphData.crpSliderData.id, thumbTextColor);
}

/**
 * Method to create the Total Cholesterol slider based on the totalCholesterol value from the
 * Cardiac Risk data model.
 */
function createCholesterolSlider() {
  var thumbDisplayText = '', thumbBackgroundColor = '', thumbTextColor = '';
  if (CardiacRisk.patientInfo.totalCholesterol < 200) {
    thumbDisplayText = CardiacRisk.graphData.totalCholesterolSliderData.toolTipData.keys[0];
    thumbBackgroundColor = CardiacRisk.colorClasses.lowRisk;
  }
  else if (CardiacRisk.patientInfo.totalCholesterol >= 200 && CardiacRisk.patientInfo.totalCholesterol < 240) {
    thumbDisplayText = CardiacRisk.graphData.totalCholesterolSliderData.toolTipData.keys[1];
    thumbBackgroundColor = CardiacRisk.colorClasses.moderateRisk;
  }
  else if (CardiacRisk.patientInfo.totalCholesterol >= 240) {
    thumbDisplayText = CardiacRisk.graphData.totalCholesterolSliderData.toolTipData.keys[2];
    thumbBackgroundColor = CardiacRisk.colorClasses.highRisk;
    thumbTextColor = CardiacRisk.colorClasses.rangeSliderThumbWhiteText;
  }

  CardiacRisk.graphData.totalCholesterolSliderData.thumbDisplayText = thumbDisplayText;
  CardiacRisk.graphData.totalCholesterolSliderData.value = CardiacRisk.patientInfo.totalCholesterol;

  generateRangeSlider(CardiacRisk.graphData.totalCholesterolSliderData);
  changeBarBackgroundColor(CardiacRisk.graphData.totalCholesterolSliderData.id, CardiacRisk.colorClasses.grayBarColor);

  changeThumbBackgroundColor(CardiacRisk.graphData.totalCholesterolSliderData.id, thumbBackgroundColor);
  changeThumbTextColor(CardiacRisk.graphData.totalCholesterolSliderData.id, thumbTextColor);
}

/**
 * Method to create the LDL slider based on the ldl value from the
 * Cardiac Risk data model.
 */
function createLDLSlider() {
  if (CardiacRisk.patientInfo.ldl === undefined)
  {
    $('#ldlBadCholesterolSlider').addClass('contentHidden');
    $('#rangeSlidersVerticalLine').removeClass().addClass('verticalLineHalf');
  }
  else
  {
    var thumbDisplayText = '', thumbBackgroundColor = '', thumbTextColor = '';
    if (CardiacRisk.patientInfo.ldl < 100) {
      thumbDisplayText = CardiacRisk.graphData.ldlSliderData.toolTipData.keys[0];
      thumbBackgroundColor = CardiacRisk.colorClasses.lowRisk;
    }
    else if (CardiacRisk.patientInfo.ldl >= 100 && CardiacRisk.patientInfo.ldl < 130) {
      thumbDisplayText = CardiacRisk.graphData.ldlSliderData.toolTipData.keys[1];
      thumbBackgroundColor = CardiacRisk.colorClasses.lowModerateRisk;
    }
    else if (CardiacRisk.patientInfo.ldl >= 130 && CardiacRisk.patientInfo.ldl < 160) {
      thumbDisplayText = CardiacRisk.graphData.ldlSliderData.toolTipData.keys[2];
      thumbBackgroundColor = CardiacRisk.colorClasses.moderateRisk;
    }
    else if (CardiacRisk.patientInfo.ldl >= 160 && CardiacRisk.patientInfo.ldl < 190) {
      thumbDisplayText = CardiacRisk.graphData.ldlSliderData.toolTipData.keys[3];
      thumbBackgroundColor = CardiacRisk.colorClasses.highRisk;
      thumbTextColor = CardiacRisk.colorClasses.rangeSliderThumbWhiteText;
    }
    else if (CardiacRisk.patientInfo.ldl >= 190) {
      thumbDisplayText = CardiacRisk.graphData.ldlSliderData.toolTipData.keys[4];
      thumbBackgroundColor = CardiacRisk.colorClasses.highRisk;
      thumbTextColor = CardiacRisk.colorClasses.rangeSliderThumbWhiteText;
    }

    CardiacRisk.graphData.ldlSliderData.thumbDisplayText = thumbDisplayText;
    CardiacRisk.graphData.ldlSliderData.value = CardiacRisk.patientInfo.ldl;
    generateRangeSlider(CardiacRisk.graphData.ldlSliderData);
    changeBarBackgroundColor(CardiacRisk.graphData.ldlSliderData.id, CardiacRisk.colorClasses.grayBarColor);

    changeThumbBackgroundColor(CardiacRisk.graphData.ldlSliderData.id, thumbBackgroundColor);
    changeThumbTextColor(CardiacRisk.graphData.ldlSliderData.id, thumbTextColor);
  }
}

/**
 * Method to create the HDL slider based on the hdl value from the
 * Cardiac Risk data model.
 */
function createHDLSlider() {
  var thumbDisplayText = '', thumbBackgroundColor = '', thumbTextColor = '';
  if ((CardiacRisk.patientInfo.hdl < 40 && CardiacRisk.patientInfo.gender === 'male') ||
      (CardiacRisk.patientInfo.hdl < 50 && CardiacRisk.patientInfo.gender === 'female')) {
    thumbDisplayText = CardiacRisk.graphData.hdlSliderData.toolTipData.keys[2];
    thumbBackgroundColor = CardiacRisk.colorClasses.highRisk;
    thumbTextColor = CardiacRisk.colorClasses.rangeSliderThumbWhiteText;
  }
  else if ((CardiacRisk.patientInfo.hdl >= 40 && CardiacRisk.patientInfo.hdl < 60 && CardiacRisk.patientInfo.gender === 'male') ||
      (CardiacRisk.patientInfo.hdl >= 50 && CardiacRisk.patientInfo.hdl < 60 && CardiacRisk.patientInfo.gender === 'female')) {
    thumbDisplayText = CardiacRisk.graphData.hdlSliderData.toolTipData.keys[1];
    thumbBackgroundColor = CardiacRisk.colorClasses.moderateRisk;
  }
  else if (CardiacRisk.patientInfo.hdl >= 60) {
    thumbDisplayText = CardiacRisk.graphData.hdlSliderData.toolTipData.keys[0];
    thumbBackgroundColor = CardiacRisk.colorClasses.lowRisk;
  }

  CardiacRisk.graphData.hdlSliderData.thumbDisplayText = thumbDisplayText;
  CardiacRisk.graphData.hdlSliderData.value = CardiacRisk.patientInfo.hdl;
  generateRangeSlider(CardiacRisk.graphData.hdlSliderData);
  changeBarBackgroundColor(CardiacRisk.graphData.hdlSliderData.id, CardiacRisk.colorClasses.grayBarColor);

  changeThumbBackgroundColor(CardiacRisk.graphData.hdlSliderData.id, thumbBackgroundColor);
  changeThumbTextColor(CardiacRisk.graphData.hdlSliderData.id, thumbTextColor);
}

/**
 * This method updates the systolic blood pressure text box with the previous sysBP value if there is no value present.
 * @method sbpInputFocusOutHandler
 */
function sbpInputFocusOutHandler() {
  if ($(this).val().length < 3)
  {
    $(this).val(CardiacRisk.patientInfo.systolicBloodPressure);
  }
}

/**
 * This method stops the user from entering any non numeric characters in the input text.
 * @param keyValue Entered digit.
 * @returns {boolean} Returns if the digit can be added to the string.
 */
function isNumberKey(keyValue) {
  var charCode = (keyValue.which) ? keyValue.which : event.keyCode;
  if (charCode === 13 || (charCode > 31 && (charCode < 48 || charCode > 57))) {
    return false;
  }
  $sbpInput = $('#sbpInput');
  var sbpValue = $sbpInput.val();
  if (sbpValue.length === 2) {
    $sbpInput.val(sbpValue + String.fromCharCode(charCode));
    onSBPInput();
  }

  return true;
}

/**
 * This method adjusts width of the right column components in the layout to style them on resize.
 */
function adjustRelatedFactorsSize() {
  var patientActionsWidth = $('#containerPatientActions').width();
  $('#containerPatientDetails').width(patientActionsWidth);
  var contentRightBottomWidth = $('#contentBoxRightBottom').width();
  $('#contentBoxRightTop').width(contentRightBottomWidth);
}

/**
 * This method updates the thumb position based on the resizing of page and resizing of the bar in the graph.
 */
function adjustRangeSliderThumbPosition() {
  updateThumbPosition(CardiacRisk.graphData.crpSliderData.id,
      CardiacRisk.graphData.crpSliderData.value,
      CardiacRisk.graphData.crpSliderData.lowerBound,
      CardiacRisk.graphData.crpSliderData.upperBound);
  updateThumbPosition(CardiacRisk.graphData.totalCholesterolSliderData.id,
      CardiacRisk.graphData.totalCholesterolSliderData.value,
      CardiacRisk.graphData.totalCholesterolSliderData.lowerBound,
      CardiacRisk.graphData.totalCholesterolSliderData.upperBound);
  updateThumbPosition(CardiacRisk.graphData.ldlSliderData.id,
      CardiacRisk.graphData.ldlSliderData.value,
      CardiacRisk.graphData.ldlSliderData.lowerBound,
      CardiacRisk.graphData.ldlSliderData.upperBound);
  updateThumbPosition(CardiacRisk.graphData.hdlSliderData.id,
      CardiacRisk.graphData.hdlSliderData.value,
      CardiacRisk.graphData.hdlSliderData.lowerBound,
      CardiacRisk.graphData.hdlSliderData.upperBound);
}


/**
 * This method builds all the data required to display graphs for lab values.
 * Any updates to this model will reflect on the graphs being drawn on the UI.
 */
function buildRangeSliderDataModel() {
	var graphData = {};

	var crpSliderData = {};
	crpSliderData.id = 'cReactiveProteinSlider';
	crpSliderData.titleLeft = 'C Reactive Protein';
	crpSliderData.titleRight = 'mg/L';
	crpSliderData.lowerBound = 0.03;
	crpSliderData.upperBound = 20;
	crpSliderData.barBoundsLowDisplay = 'Low';
	crpSliderData.barBoundsHighDisplay = 'High';
	crpSliderData.toolTipData = {
		'keys' : ['Low', 'Moderate', 'High'],
		'values': ['0.03 - 0.9', '1 - 2.9', '3 - 20'],
		'styleClass': 'tooltipsterCardiacRiskCRP'
	};
	graphData.crpSliderData = crpSliderData;

	var totalCholesterolSliderData = {};
	totalCholesterolSliderData.id = 'totalCholesterolSlider';
	totalCholesterolSliderData.titleLeft = 'Total Cholesterol';
	totalCholesterolSliderData.titleRight = 'mg/dL';
	totalCholesterolSliderData.lowerBound = 140;
	totalCholesterolSliderData.upperBound= 401;
	totalCholesterolSliderData.barBoundsLowDisplay = 'Desirable';
	totalCholesterolSliderData.barBoundsHighDisplay = 'High';
	totalCholesterolSliderData.toolTipData = {
		'keys' : ['Desirable', 'Borderline High', 'High'],
		'values': ['140 - 199', '200 - 239', '240 - 401'],
		'styleClass': 'tooltipsterCardiacRiskTotalCholesterol'
	};
	graphData.totalCholesterolSliderData = totalCholesterolSliderData;

	if (CardiacRisk.patientInfo.ldl !== undefined) {
		var ldlSliderData = {};
		ldlSliderData.id = 'ldlBadCholesterolSlider';
		ldlSliderData.titleLeft = 'LDL "Bad" Cholesterol';
		ldlSliderData.titleRight = 'mg/dL';
		ldlSliderData.lowerBound = 50;
		ldlSliderData.upperBound = 210;
		ldlSliderData.barBoundsLowDisplay = 'Optimal';
		ldlSliderData.barBoundsHighDisplay = 'High';
		ldlSliderData.toolTipData = {
			'keys' : ['Optimal', 'Near/Above Optimal', 'Borderline High', 'High', 'Very High'],
			'values': ['50 - 100', '101 - 129', '130 - 159', '160 - 189', '190 - 210'],
			'styleClass': 'tooltipsterCardiacRiskLDL'
		};
		ldlSliderData.barHeight = 6;
		graphData.ldlSliderData = ldlSliderData;
	}

	var hdlSliderData = {};
	hdlSliderData.id = 'hdlGoodCholesterolSlider';
	hdlSliderData.titleLeft = 'HDL "Good" Cholesterol';
	hdlSliderData.titleRight = 'mg/dL';
	hdlSliderData.lowerBound = 30;
	hdlSliderData.upperBound = 150;
	hdlSliderData.barBoundsLowDisplay = 'Protective';
	hdlSliderData.barBoundsHighDisplay = 'High';
	if (CardiacRisk.patientInfo.gender === 'male') {
		hdlSliderData.toolTipData = {
			'keys' : ['High', 'Higher the Better', 'Low'],
			'values': ['60 - 150', '40 - 59', '30 - 39'],
			'styleClass': 'tooltipsterCardiacRiskHDL'
		};
	}
	else if (CardiacRisk.patientInfo.gender === 'female') {
		hdlSliderData.toolTipData = {
			'keys' : ['High', 'Higher the Better', 'Low'],
			'values': ['60 - 150', '50 - 59', '30 - 49'],
			'styleClass': 'tooltipsterCardiacRiskHDL'
		};
	}
	hdlSliderData.barHeight = 6;

	graphData.hdlSliderData = hdlSliderData;
	CardiacRisk.graphData = graphData;
}
/**
 * Generic method to create the range slider component.
 * @param data This is the data structure needed to build the component.
 *   Structure :
 *      id : The div id to be use to reference the component.
 *      titleLeft : Title text for the left header.
 *      titleRight : Title text for the right header.
 *      lowerBound : Lower bound value for the bar calculations.
 *      upperBound : Upper bound value for the bar calculations.
 *      barBoundsLowDisplay : Display text for the footer left bar bounds.
 *      barBoundsHighDisplay : Display text for the footer right bar bounds.
 *      toolTipData :
 *      {
            "keys" : Array of left column text.
                    Eg. ["Low", "Moderate", "High"]
            "values": Array of right column text.
                    Eg. ["0.03 - 0.9", "1 - 2.9", "3 - 20"]
            "styleClass": Styling class.
        }
 *      barHeight : Height to be used for the bar component of the graph.
 */
function generateRangeSlider(data) {
    var $sliderDiv = $('#' + data.id);
    $sliderDiv.append(
        '<header id=' + data.id + 'Header' + ' class="rangeSliderHeaderStyle">' +
            '<div>' +
                '<span id=' + data.id + 'TitleLeft' + ' class="headerLeftStyle">'+ data.titleLeft +'</span>' +
                '<span id=' + data.id + 'Image' + ' class="iconStyle fa fa-info-circle"></span>' +
        '   </div>' +
            '<span id=' + data.id + 'TitleRight' + '>'+ data.titleRight +'</span>' +
        '</header>' +
        '<div class="rangeSliderContentStyle">' +
            '<div id=' + data.id + 'Bar' + ' class="rangeSliderBarStyle"></div>' +
            '<div id=' + data.id + 'Thumb' + ' class="rangeSliderThumbStyle">'+ data.value +'</div>' +
            '<div id=' + data.id + 'ThumbDisplayText' + ' class="rangeSliderThumbDisplayTextStyle">' + data.thumbDisplayText + '</div>' +
        '</div>' +
        '<footer id=' + data.id + 'Footer' + ' class="rangeSliderFooterStyle">' +
            '<div class="footerLeftStyle">' +
                '<span id=' + data.id + 'FooterLeft' + '>'+ data.barBoundsLowDisplay +'</span>' +
            '</div>' +
            '<div class="footerRightStyle">' +
                '<span id=' + data.id + 'FooterRight' + '>'+ data.barBoundsHighDisplay +'</span>' +
            '</div>' +
        '</footer>'
    );
    updateBarHeight(data.id, data.barHeight);
    updateToolTips(data.id, data.toolTipData);
    updateThumbPosition(data.id, data.value, data.lowerBound, data.upperBound);
}

/**
 * Method to update the content of tool tip for the more information icon.
 * @param id Indicates the div id to be used to update the tooltip.
 * @param toolTipData
 */
function updateToolTips(id, toolTipData) {
    var contentString = '<table class="'+ toolTipData.styleClass + '">';
    var tableRows = '';

    for (step = 0; step < toolTipData.keys.length ;step++) {
        tableRows = tableRows.concat('<tr>');
        tableRows = tableRows.concat(
            '<td class="zeroMargin">'+ toolTipData.keys[step] +'</td>' +
            '<td> </td>' +
            '<td class="zeroMargin">' + toolTipData.values[step] + '</td>'
        );
        tableRows = tableRows.concat('</tr>');
    }
    contentString = contentString.concat(tableRows, '</table>');

    $('#' + id + 'Image').tooltipster({
        contentAsHTML : true,
        delay : 100,
        theme: 'tooltipster-CardiacRisk',
        content: $(contentString)
    });
}

/**
 * Method to update the bar height in the graph.
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param barHeight : Indicates the height to use.
 */
function updateBarHeight(id, barHeight) {
    $('#' + id + 'Bar').css('height', '');
    $('#' + id + 'Bar').css('height', barHeight);
    if (barHeight < 12)
    {
        $('#' + id + 'Header').css('margin-bottom',2 * barHeight);
        $('#' + id + 'Thumb').addClass('barHeightThumbAdjustment');
        $('#' + id + 'ThumbDisplayText').addClass('barHeightThumbTextAdjustment');
        $('#' + id + 'Footer').addClass('barFooterAdjustment');
    }
}

/**
 * Method to change background color of the bar.
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param color
 */
function changeBarBackgroundColor(id, color) {
    $('#' + id + 'Bar').css('background-color', '');
    $('#' + id + 'Bar').addClass(color);
}

/**
 * Method to change the thumb's background color
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param color
 */
function changeThumbBackgroundColor(id, color) {
    $('#' + id + 'Thumb').css('background-color', '');
    $('#' + id + 'Thumb').addClass(color);
}

/**
 * Method to change the thumb's text color
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param color
 */
function changeThumbTextColor(id, color) {
    if (color.length) {
        $('#' + id + 'Thumb').removeClass('rangeSliderThumbStyle').addClass(color);
    }
}

/**
 * Method to update the thumb's left position based on the data value.
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param value : The value indicating the actual data value.
 * @param lowerBound : Value for the lower bound.
 * @param upperBound : Value for the upper bound.
 */
function updateThumbPosition(id, value, lowerBound, upperBound) {
    var thumbOffset = 0;
    if (value <= lowerBound) {
        thumbOffset = 0;
        changeThumbPositionToPosition(id, thumbOffset);
        changeThumbValueTextToPosition(id, thumbOffset);
        return;
    }

    var $barWidth = $('#' + id + 'Bar').width();
    var $thumb = $('#' + id + 'Thumb');
    var thumbWidthAdjustment = $thumb.width() +
        parseFloat($thumb.css('padding-left').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('padding-right').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('borderLeftWidth').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('borderRightWidth').replace(/[^-\d.]/g, ''));
    var valueToConsider = value;
    if (value > upperBound) {
        valueToConsider = upperBound;
    }
    var position = ((valueToConsider - lowerBound)/(upperBound - lowerBound)) * $barWidth;
    thumbOffset = position - thumbWidthAdjustment;
    if (thumbOffset < 0) {
        thumbOffset = 0;
    }
    changeThumbPositionToPosition(id, thumbOffset);
    changeThumbValueTextToPosition(id, thumbOffset);
}

/**
 * Method to change the thumb's value text position. This is calculated based on the thumb's position.
 * If this calculated position overlaps the left bounds text or right bounds text then the left or right bounds
 * labels are hidden.
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param offset : Indicates the thumb's left offset.
 */
function changeThumbValueTextToPosition(id, offset) {

    var $thumb = $('#' + id + 'Thumb');
    var $barWidth = $('#' + id + 'Bar').width();
    var $thumbDisplayWidth = $('#' + id + 'ThumbDisplayText').width();
    var thumbWidth = $thumb.width() +
        parseFloat($thumb.css('padding-left').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('padding-right').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('borderLeftWidth').replace(/[^-\d.]/g, '')) +
        parseFloat($thumb.css('borderRightWidth').replace(/[^-\d.]/g, ''));
    var offsetForDisplay = offset + (thumbWidth / 2) - ($thumbDisplayWidth / 2);
    if (offsetForDisplay < 0) offsetForDisplay = 0;
    if (offsetForDisplay > ($barWidth - $thumbDisplayWidth)) offsetForDisplay = $barWidth - $thumbDisplayWidth;

    $('#' + id + 'ThumbDisplayText').css('left', '');
    $('#' + id + 'ThumbDisplayText').css('left', offsetForDisplay);

    if (offsetForDisplay >= 0 && offsetForDisplay <= $('#' + id + 'FooterLeft').width()) {
        $('#' + id + 'FooterLeft').css('visibility', 'hidden');
    }
    else {
        if ((offsetForDisplay + $thumbDisplayWidth) <= $barWidth && (offsetForDisplay + $thumbDisplayWidth) >= $barWidth - $('#' + id + 'FooterRight').width()) {
            $('#' + id + 'FooterRight').css('visibility', 'hidden');
        }
    }
}

/**
 * Method to change the thumb's position.
 * @param id : Indicates the div id to be used to update the tooltip.
 * @param offset : Indicates the value to position the thumb.
 */
function changeThumbPositionToPosition(id, offset) {
    $('#' + id + 'Thumb').css('left', '');
    $('#' + id + 'Thumb').css('left', offset);
}
