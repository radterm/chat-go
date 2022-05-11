import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

var locurl = window.location.origin
console.log("Full url", locurl)

const turl = new URL(locurl)
console.log("Domain", turl.hostname)
console.log("Port", turl.port)

const chatUrl = "ws://" + turl.hostname + ":" + turl.port + "/api/v1/chat/socket"
const loginUrl = "http://" + turl.hostname + ":" + turl.port + "/api/v1/token"
const signUpUrl = "http://" + turl.hostname + ":" + turl.port + "/api/v1/signUp"
const friendListUrl = "http://" + turl.hostname + ":" + turl.port + "/api/v1/auth/friends"

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      {/*<App socketUrl={chatUrl} tokenUrl={loginUrl} lastAuth={lastAuth} />*/}
      <App 
        socketUrl={chatUrl} 
        tokenUrl={loginUrl} 
        signUpUrl={signUpUrl}
        friendListUrl={friendListUrl}
      />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
