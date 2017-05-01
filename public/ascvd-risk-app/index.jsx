import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App/app';
import ASCVDRisk from './app/load_fhir_data';

ASCVDRisk.fetchPatientData().then(
  () => {
    const spinnerNode = document.getElementById('loadingSpinner');
    while (spinnerNode.firstChild) {
      spinnerNode.removeChild(spinnerNode.firstChild);
    }
    spinnerNode.parentNode.removeChild(spinnerNode);
    ReactDOM.render(<App />, document.getElementById('container'));
  },
);
