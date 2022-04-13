import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

var locurl = window.location.origin
console.log("Full url", locurl)

const turl = new URL(locurl)
console.log("Domain", turl.hostname)
console.log("Port", turl.port)

const url = "ws://" + turl.hostname + ":" + turl.port + "/api/v1/"

ReactDOM.render(
  <React.StrictMode>
    <App url={url} />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
