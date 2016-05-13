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
        else if (CardiacRisk.patientInfo.relatedFactors.smoker === false &&
            CardiacRisk.optimalLabs() &&
            CardiacRisk.patientInfo.relatedFactors.familyHeartAttackHistory === true &&
            score > 5) {
            whatIfOptimalValues.value = '';
            whatIfOptimalValues.valueText = 'Your risk is the lowest it can be based on the supplied information';
        }
        else if (CardiacRisk.optimalLabs()) {
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
