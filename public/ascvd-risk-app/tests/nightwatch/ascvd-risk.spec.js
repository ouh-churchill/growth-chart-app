/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const screenshot = require('terra-toolkit').screenshot;

module.exports = {
  afterEach: (browser, done) => {
    screenshot(browser, done);
  },

  /**
   * Requirements Covered: [811445, 811458]
   * 811445 - The system shall receive demo information through the FHIR Person API:
   *  - Patient Name, Age, Gender
   * 811458 - If there is a demographics banner to display then the system shall display it
   */
  '811445 - Receives demographic information through the FHIR API': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.visible('#formSex .button_form__active')
      .assert.containsText('.banner__name', 'John Doe');
  },

  '811458 - displays text for the Patient Banner on the Form tab if specified': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.containsText('.banner__patient-container', 'John Doe\n50 yrsM');
  },

  /**
   * Requirements Covered: [811575, 811582, 1140281]
   *  811575 - The system shall accept manually-entered values from 130-320 (Total Cholesterol)
   *           The system shall display any value within that range received through the FHIR Observation API
   *
   *  811582 - The system shall accept manually-entered values from 20-100 (HDL)
   *           The system shall display any value within that range received through the FHIR Observation API
   *
   *  1140281 - The system shall accept manually-entered values from 90-200 (Systolic Blood Pressure)
   *            The system shall display any value within that range received through the FHIR Observation API
   */
  '811575 - receives total cholesterol results through FHIR or manual entry': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.attributeEquals('#formTotalCholesterol .input_text_form__text-entry', 'value', '150')
      .clearValue('#formTotalCholesterol .input_text_form__text-entry')
      .setValue('#formTotalCholesterol .input_text_form__text-entry', '140')
      .assert.attributeEquals('#formTotalCholesterol .input_text_form__text-entry', 'value', '140');
  },

  '811582 - receives HDL results through FHIR or manual entry': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.attributeEquals('#formHdl .input_text_form__text-entry', 'value', '30')
      .clearValue('#formHdl .input_text_form__text-entry')
      .setValue('#formHdl .input_text_form__text-entry', '50')
      .assert.attributeEquals('#formHdl .input_text_form__text-entry', 'value', '50');
  },

  '1140281 - receives SysBP results through FHIR or manual entry': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.attributeEquals('#formSysBP .input_text_form__text-entry', 'value', '170')
      .clearValue('#formSysBP .input_text_form__text-entry')
      .setValue('#formSysBP .input_text_form__text-entry', '160')
      .assert.attributeEquals('#formSysBP .input_text_form__text-entry', 'value', '160');
  },

  /**
   * Requirements Covered: [811600, 1140384, 1140385, 812956]
   *  811600 - The system shall allow the user to indicate whether the patient is or is not a current smoker
   *  1140384 - The system shall allow the user to indicate whether the patient does or does not have diabetes
   *  1140385 - The system shall allow the user to indicate whether the patient is or is not being
   *            treated for hypertension
   *  812956 - The system shall allow the user to indicate Race: African American | White | Other
   */
  '811600 - allows the user to indicate smoker status': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .click('#formSmoker .button_form__left .button_form__btn')
      .assert.cssClassPresent('#formSmoker .button_form__left .button_form__btn', 'button_form__active');
  },

  '811600 - allows the user to indicate diabetes status': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .click('#formDiabetic .button_form__left .button_form__btn')
      .assert.cssClassPresent('#formDiabetic .button_form__left .button_form__btn', 'button_form__active');
  },

  '811600 - allows the user to indicate hypertensive status': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .click('#formHypertensive .button_form__left .button_form__btn')
      .assert.cssClassPresent('#formHypertensive .button_form__left .button_form__btn', 'button_form__active');
  },

  '812956 - allows the user to indicate Race': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .click('label[for="option_three"] input')
      .assert.attributeContains('label[for="option_three"] input', 'checked', 'true');
  },

  /**
   * Requirements Covered: [1144674, 1144829]
   *  1144674 - System supports a Results view: Sex (buttons, male or female) | Age (numeric free text) |
   *            Race (radio buttons, White/African American/Other) | Total Cholesterol (numeric free text) |
   *            HDL (numeric free text) | Systolic Blood Pressure (numeric free text) |
   *            Diabetes (buttons, No or Yes) | Current Smoking (buttons, No or Yes) |
   *            Treatment for Hypertension (buttons, No or Yes) |
   *            Update Risk Score (button, disabled until required fields addressed)
   *
   *            All fields required. Required fields have red asterisk to left of title on unaddressed
   *            form fields. Text displays to right of Update Risk Score button with text: "*<unaddressed items>
   *            required to compute ASCVD risk"
   *
   *  1144829 - Risk score button is dithered unless all fields have been addressed. User is required
   *            to select button again to obtain a new Cardiac Risk score if any entered information
   *            is changed. When a score has not yet been calculated for the first time, button text is
   *            "See Risk Score". If a score has been previously calculated, button text is "Update Risk Score"
   *
   */
  '1144674 - displays required fields and input for Results view': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.containsText('#formSex .button_form__prompt', 'Sex')
      .assert.value('#formSex .button_form__active', 'Male')
      .assert.value('#formSex .button_form__default', 'Female')
      .assert.containsText('#formAge .input_text_form__prompt', 'Age')
      .assert.elementPresent('#formAge input')
      .assert.containsText('.radio_button_form__prompt', 'Race')
      .assert.value('label[for="option_one"] input', 'White')
      .assert.value('label[for="option_two"] input', 'African American')
      .assert.value('label[for="option_three"] input', 'Other')
      .assert.containsText('#formTotalCholesterol .input_text_form__prompt', 'Total Cholesterol (mg/dL)')
      .assert.elementPresent('#formTotalCholesterol input')
      .assert.containsText('#formHdl .input_text_form__prompt', 'HDL - Cholesterol (mg/dL)')
      .assert.elementPresent('#formHdl input')
      .assert.containsText('#formSysBP .input_text_form__prompt', 'Systolic Blood Pressure')
      .assert.elementPresent('#formSysBP input')
      .assert.containsText('#formDiabetic .button_form__prompt', 'Diabetes')
      .assert.value('#formDiabetic .button_form__left .button_form__btn', 'No')
      .assert.value('#formDiabetic .button_form__right .button_form__btn', 'Yes')
      .assert.containsText('#formSmoker .button_form__prompt', 'Current Smoking')
      .assert.value('#formSmoker .button_form__left .button_form__btn', 'No')
      .assert.value('#formSmoker .button_form__right .button_form__btn', 'Yes')
      .assert.containsText('#formHypertensive .button_form__prompt', 'Treatment for Hypertension')
      .assert.value('#formHypertensive .button_form__left .button_form__btn', 'No')
      .assert.value('#formHypertensive .button_form__right .button_form__btn', 'Yes')
      .assert.elementPresent('.send_form__btn')
      .assert.value('.send_form__btn', 'See Risk Score');

    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.elementPresent('#formDiabetic .button_form__required')
      .assert.containsText('.send_form__right', 'Diabetes status is required to compute ASCVD risk');
  },

  '1144829 - handles workflow of submitting the form accordingly': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.attributeContains('.send_form__btn', 'disabled', 'true')
      .click('#formDiabetic .button_form__right .button_form__btn')
      .assert.cssClassPresent('.send_form__btn', 'send_form__active')
      .assert.value('.send_form__btn', 'See Risk Score')
      .click('.send_form__btn').click('.navbar__one')
      .assert.value('.send_form__btn', 'Update Risk Score');
  },

  /**
   * Requirements Covered: [1144826, 1144733]
   *  1144826 - When the app loads,the Results view is displayed without a Navigation Bar. The bar appears
   *            whenever the user has already calculated Risk Factors
   *
   *  1144733 - The Navigation Bar consists of three buttons representing each view in the app: Results, Risk
   *            Factors, and Recommendations. The system shall indicate which view is selected by a blue
   *            underline with blue text. Non-selected font color is
   *              black: user may navigate to the other views by selecting this text
   *              grey (and inactive): user is at Results view and required fields have not been addressed
   */
  '1144826 - hides and displays the Navigation Bar appropriately': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .assert.hidden('.navbar__hidden')
      .click('#formDiabetic .button_form__right .button_form__btn').click('.send_form__btn')
      .assert.visible('.navbar__container');
  },

  '1144733 - disables and enables Navigation Bar buttons appropriately': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/results.html`)
      .click('#formDiabetic .button_form__right .button_form__btn').click('.send_form__btn')
      .assert.value('.navbar__one', 'Results').assert.cssClassPresent('.navbar__one', 'navbar__default')
      .assert.value('.navbar__two', 'Risk Factors').assert.cssClassPresent('.navbar__two', 'navbar__active')
      .assert.value('.navbar__three', 'Recommendations').assert.cssClassPresent('.navbar__three', 'navbar__default')
      .click('.navbar__one').click('#formDiabetic .button_form__left .button_form__btn')
      .assert.value('.navbar__active', 'Results')
      .assert.cssClassPresent('.navbar__two', 'navbar__disabled')
      .assert.cssClassPresent('.navbar__three', 'navbar__disabled');
  },

  /**
   * Requirements Covered: [1144739]
   *  1144739 - The view contains a two-axis bar graph depicting the following:
   *    Current and lowest possible 10-Year Risk | Current and lowest possible Lifetime Risk
   *      - Note: 10-Year or Lifetime risk graphs only display when patient is within appropriate age
   *              range
   *    Graph labels:
   *      X-axis: 10 Year Risk | Lifetime Risk | Title: Chance of heart attack or stroke
   *      Y-axis: 0-100, with numbers displayed at 0, 20, 40, 60, 80, 100 | Title: Percent (%)
   *      Legend: Color and label indicating Current and Lowest Possible risk
   *
   */
  '1144739 - displays a graph with necessary content': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/riskfactors.html`)
      .click('.send_form__active')
      .elements('css selector', '.graph_bar__bar', (res) => {
        browser.assert.ok(res.value.length === 4);
      })
      .assert.containsText('.graph__ten-year-group .graph__bar-label', '10 Year Risk')
      .assert.containsText('.graph__lifetime-group .graph__bar-label', 'Lifetime Risk')
      .assert.containsText('.graph__graph-title', 'Chance of heart attack or stroke')
      .assert.containsText('.graph__yaxis', '100\n80\n60\n40\n20\n0')
      .assert.containsText('.graph__label', 'Percent (%)')
      .assert.containsText('.graph__legend-container', 'Current Risk\nLowest Possible Risk');
  },

  /**
   * Requirements Covered: [1144797]
   *  1144797 - The view contains an "interactive" bar graph. The graph represents Current Risk with indication
   *            of lowest possible risk. Check boxes representing preventative measures can be checked/unchecked.
   *            Graph bar responds accordingly.
   *            Graph Labels:
   *              Current Risk (<n>%) | Potential Risk (<n>%) | Lowest Possible Risk (<n>%) | 0%
   *
   *            Preventative Measures:
   *              Title - "Explore how different actions could reduce your risk of heart attack or stroke."
   *              Check boxes with the following labels: "Take a statin" | "Control your blood pressure" (only
   *              if patient SBP > 140) | Take aspirin every day | Quit smoking (only if patient is smoker)
   *
   */
  '1144797 - displays content for interactive risk factors': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/riskfactors.html`)
      .click('label[for="option_two"] input')
      .click('#formSex .button_form__right input')
      .clearValue('#formAge .input_text_form__text-entry')
      .setValue('#formAge .input_text_form__text-entry', '75')
      .click('.send_form__active')
      .assert.containsText('.simulated_risk__bar-labels', 'Current Risk')
      .assert.containsText('.simulated_risk__bar-labels', 'Lowest Possible Risk')
      .assert.containsText('.simulated_risk__bar-labels', '0%')
      .assert.containsText('.risk_action__prompt',
      'Explore how different actions could reduce your risk of heart attack or stroke')
      .assert.containsText('.risk_action__input-area', 'Take a statin')
      .assert.containsText('.risk_action__input-area', 'Control your blood pressure')
      .assert.containsText('.risk_action__input-area', 'Take aspirin every day')
      .assert.containsText('.risk_action__input-area', 'Quit smoking')
      .assert.hidden('.simulated_risk__bar-potential-risk')
      .click('label[for="aspirin"] input')
      .assert.containsText('.simulated_risk__bar-labels', 'Current Risk\n51.7%')
      .assert.containsText('.simulated_risk__bar-labels', 'Potential Risk\n46.5%')
      .assert.containsText('.simulated_risk__bar-labels', 'Lowest Possible Risk\n8.5%')
      .assert.containsText('.simulated_risk__bar-labels', '0%')
      .assert.visible('.simulated_risk__bar-potential-risk')
      .assert.visible('.simulated_risk__bar-current-risk')
      .assert.visible('.simulated_risk__bar-lowest-risk')
      .click('label[for="sysBP"] input')
      .click('label[for="smoker"] input')
      .assert.hidden('.simulated_risk__bar-current-risk');
  },

  '1144797 - displays only relevant simulated risk actions': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/riskfactors.html`)
      .clearValue('#formSysBP .input_text_form__text-entry')
      .setValue('#formSysBP .input_text_form__text-entry', '130')
      .click('#formSmoker .button_form__left .button_form__btn')
      .click('.send_form__active')
      .assert.hidden('label[for="sysBP"]')
      .assert.hidden('label[for="smoker"]');
  },

  /**
   * Requirements Covered: [1144804, 1144808]
   *  1144804 - The system shall support a responsive UI with two views on the Results page.
   *            - Large (standard): UI will display on devices larger than 860px in width
   *            - Small (mobile): UI will display on devices 860px or less in width
   *
   *  1144808 - Large UI has: 3-column layout of Results view, and Navigation bar, when displayed,
   *            will appear in the top left of view
   *
   *  1144824 - Small UI has: 1-column layout of Results view, and Navigation bar, when displayed,
   *            appears centered at the top of the view
   *
   *            Risk Factors View: Graphs respond in width to accommodate display width
   */
  '[1144804, 1144808, 1144824] - Displays 3-column and 1-column results view accordingly': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/riskfactors.html`)
      .click('.send_form__active')
      .click('.navbar__one')
      .resizeWindow(861, 1000)
      .assert.cssProperty('.index__grouped-column', 'display', 'inline-block')
      .assert.cssProperty('.navbar__container', 'text-align', 'start')
      .resizeWindow(860, 1000)
      .assert.cssProperty('.index__grouped-column', 'width', '180px')
      .assert.cssProperty('.index__grouped-column', 'display', 'block')
      .assert.cssProperty('.navbar__container', 'text-align', 'center');
  },

  '1144824 - Risk Factors view responds in width to accommodate display width': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/riskfactors.html`)
      .click('.send_form__active')
      .resizeWindow(861, 1000)
      .assert.cssProperty('.graph__graph-border', 'width', '600px')
      .assert.cssProperty('.graph_bar__bar', 'width', '100px')
      .assert.cssProperty('.simulated_risk__bar-total', 'width', '100px')
      .resizeWindow(860, 1000)
      .assert.cssProperty('.graph__graph-border', 'width', '520px')
      .assert.cssProperty('.graph_bar__bar', 'width', '80px')
      .assert.cssProperty('.simulated_risk__bar-total', 'width', '80px')
      .resizeWindow(700, 1000)
      .assert.cssProperty('.graph__graph-border', 'width', '155px')
      .assert.cssProperty('.graph_bar__bar', 'width', '20px')
      .assert.cssProperty('.simulated_risk__bar-total', 'width', '40px');
  },

  /**
   * Requirements Covered: [1152726]
   *  1152726 - Each recommendation displays in a collapsible text box.
   *      - Collapsing/expanding the recommendation title will hide/show the associated text
   *      - Title: Quit smoking (displays only if patient smokes) - see associated description below -
   *      - Title: Consider a statin - see associated description below -
   *      - Title: Take an aspirin every day - see associated description below -
   *      - Title: Control your blood pressure - see associated description below -
   *      - Title: Exercise - see associated description below -
   */
  '1152726 - Recommendations view with content': (browser) => {
    browser
      .url(`http://localhost:${browser.globals.webpackDevServerPort}/recommendations.html`)
      .assert.containsText('#recSmoker .detail_box__title', 'Quit Smoking')
      .assert.containsText('#recSmoker .detail_box__description', 'Besides causing cancer and lung disease, smoking ' +
        'is a leading cause of stroke and heart attack. Nicotine replacement (patches, gum, lozenges), ' +
        'coaching programs, and medications (Chantix, Buproprion) can increase your chances of success. ' +
        'See www.smokefree.gov for more information.')
      .assert.containsText('#recStatin .detail_box__title', 'Consider a statin')
      .assert.containsText('#recStatin .detail_box__description', 'Statins can reduce your risk of heart attack or ' +
        'stroke by 25%, even if your cholesterol level is in the “normal” range. The American Heart ' +
        'Association and American College of Cardiology recommend statins for people with diabetes, prior ' +
        'heart disease or stroke, and people at high risk of developing heart disease.')
      .assert.containsText('#recAspirin .detail_box__title', 'Aspirin')
      .assert.containsText('#recAspirin .detail_box__description', 'Aspirin can help lower your risk of heart attack ' +
        'or stroke by about 10%. Aspirin may increase your risk of bleeding. Talk to your doctor about ' +
        'whether you may benefit from taking aspirin daily and what dose may be the best.')
      .assert.containsText('#recBP .detail_box__title', 'Control your blood pressure')
      .assert.containsText('#recBP .detail_box__description', 'Every 10 point lowering of your systolic blood pressure ' +
        'or 5 point lowering of your diastolic blood pressure can lower your risk of heart disease by 21%. High blood ' +
        'pressure can be treated with diet, weight loss, and medications. Lowering your sodium intake to 2,400 mg per ' +
        'day or even as low as 1,000 mg per day can help lower your blood pressure. Different people benefit from ' +
        'different goal blood pressures. Ask your doctor what your goal should be.')
      .assert.containsText('#recExercise .detail_box__title', 'Exercise More')
      .assert.containsText('#recExercise .detail_box__description', 'The American Heart Association and American College ' +
        'of Cardiology recommend 3-4 sessions per week of at least 40 minutes per session of moderate to vigorous ' +
        'physical activity. But even small increases in your amount of physical activity can improve your heart health.')
      .assert.containsText('#recEating .detail_box__title', 'Eat more Heart-Healthy Food')
      .assert.containsText('#recEating .detail_box__description', 'Try to limit your intake of sugar, including sweets ' +
        'and sugar sweetened drinks. Eating more vegetables, fruits, whole grains, low-fat dairy, poultry (chicken), ' +
        'fish, beans, olive oil and nuts can help lower your risk of heart disease. Try to avoid or reduce trans fat and ' +
        'saturated fat, which are high in lard, butter, red meat, and fried foods.')
      .click('#recSmoker .detail_box__header')
      .assert.hidden('#recSmoker .detail_box__description')
      .assert.visible('#recSmoker .detail_box__title');
  }
};
