import logo from './logo.svg';
import './App.css';
import './chat.css';
import React from 'react';
import { Routes, Route, Link, Navigate } from "react-router-dom";

class ChatForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({value: event.target.value}); 
  }

  handleSubmit(event) {
    this.props.alertSubmit(this.state.value);
    this.setState({value: ""});
    event.preventDefault();
  }

  render(){
    return (
      <form onSubmit={this.handleSubmit}>

        <fieldset>
          
          <input type="text" value={this.state.value} placeholder="Type message here" 
                  autoFocus onChange={this.handleChange} />
          <input type="hidden" />

        </fieldset>

      </form>
    );
  }
}

class chat {
  constructor(name, time, msg){
    this.name = name;
    this.time = time;
    this.msg = msg;
  }
}

function ChatMessage(props) {
  return (
    <div class="chat-message clearfix">

      <div class="chat-message-content clearfix">

        <div class="chat-message-header">

          <span class="chat-time">{props.chat.time}</span>

          <h5>{props.chat.name}</h5>

        </div>
        
        <p>{props.chat.msg}</p>

      </div>

    </div>
  );
}

class ChatHistory extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      chats : props.chats,
      player: 0
    };
    this.chatscrollref = React.createRef();
  }
  getSnapshotBeforeUpdate(prevProps, prevState) {
    const elem = this.chatscrollref.current;
    var pos = elem.scrollTop;
    var max = elem.scrollHeight - elem.clientHeight;
    return {
      pos: pos,
      max: max
    };   
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    const elem = this.chatscrollref.current;
    if (snapshot.pos === snapshot.max) {
      var max = elem.scrollHeight - elem.clientHeight;
      elem.scrollTop = max ;
    }
    else {
      elem.scrollTop = snapshot.pos;
    }
  }
  render() {
    return (
      <div class="chat-history-container" ref={this.chatscrollref}>
      {
        this.state.chats.map(chat =>
          <div>
            <ChatMessage chat={chat}/>
            <hr />
          </div>
        )
      }
      </div>
    );
  }
}

class ChatApp extends React.Component {
  constructor(props){
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.socketUrl = props.socketUrl;
    this.state = {
      chats : [],
      player: props.username
    };
  }
  handleSubmit(message){
    var newchats = this.state.chats;
    var d = new Date()
    var newchat = new chat(this.state.player, d.toLocaleTimeString(), message);
    newchats.push(newchat);
    this.setState({chats: newchats}, () => {
      var chatmsg = JSON.stringify(newchat);
      console.log("Sending message", chatmsg);
      this.socket.send(chatmsg);
    });
  }
  handleSocketMessage(chatmsgjson){
    console.log("Got jsn msg", chatmsgjson);
    var chatMsg = JSON.parse(chatmsgjson);
    var newchats = this.state.chats;
    var newchat = new chat(chatMsg.name, chatMsg.time, chatMsg.msg);
    newchats.push(newchat);
    this.setState({chats: newchats});
  }
  componentDidMount(){
    this.intializeWebSocket()
  }
  intializeWebSocket(){
    this.socket = new WebSocket(this.socketUrl);
    this.socket.onmessage = (e) => {
      this.handleSocketMessage(e.data)
    }
  }
  render(){
    return (
      <div className="App">
        <ChatHistory chats={this.state.chats}></ChatHistory>
        <ChatForm alertSubmit={this.handleSubmit}></ChatForm>
      </div>
    );
  }
}

class LoginApp extends React.Component {
  constructor(props) {
    super(props);
    this.url = props.tokenUrl
    this.updateMasterToken = props.updateToken
    this.state = {username: '', password: '', authState: 'unauthenticated'};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.updateToken = this.updateToken.bind(this);
    this.authFailed = this.authFailed.bind(this);
  }

  handleChange(source, event) {
    switch(source) {
      case "username":
        this.setState({username: event.target.value}); 
        break;
      case "password":
        this.setState({password: event.target.value}); 
        break;
    }
    this.setState({value: event.target.value}); 
  }

  postData(url = '', username, password) {
    fetch(url, {
      method: 'POST',
      mode: 'cors', 
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', 
      referrerPolicy: 'no-referrer', 
      body: "name=" + username + "&password=" + password
    }).then((response)=>{
      if(!response.ok){
        console.log("Failed token fetch with status",response.status);
        this.authFailed();
        return;
      }
      return response.json();
    }).then(data => {
      console.log("Got json respose", data);
      if(data.token!=null) {
        this.updateToken(data.token, this.state.username);
      }
      else {
        this.authFailed();
      }
    });
  }

  updateToken(token, name) {
    this.setState({authState: "authenticated"}, ()=>this.updateMasterToken(token, name));
  }

  authFailed() {
    console.log("authFailed")
    this.setState({authState: "failed"}, ()=>this.updateMasterToken(0, ""));
  }

  handleSubmit(event) {
    var formdata = new FormData(event.target);
    this.postData(this.url, formdata.get("username"), formdata.get("password"))
    this.setState({authState: "authenticating"});
    event.preventDefault();
  }

  render(){
    return (
      <form onSubmit={this.handleSubmit}>

        <fieldset>
          
          <input type="text" value={this.state.username} placeholder="Type username" 
                  autoFocus onChange={(e)=>this.handleChange('username',e)} name="username"/> <br/>
          <input type="password" value={this.state.password} onChange={(e)=>this.handleChange('password',e)}
                 name="password" /> <br />
          <input type="submit" />

        </fieldset>
        <span>{this.state.authState}</span>

      </form>
    );
  }
}

function LogoutApp(props) {
  const logOutButton = (
    <button onClick={
      ()=>{
        console.log("Resetting token");
        props.resetToken();
      }
    } >Logout</button>
  );
  const loggedOutMsg = (<span>Logged out successfully!</span>);
  const logOutWidget = props.loggedIn ? logOutButton : loggedOutMsg ;
  return (
    <div>
      {logOutWidget}
    </div>
  )
}

const tokenCookieName = "authorization-token" ;
const usernameCookieName = "username";

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      token: "", 
      username: "",
      authenticated: false
    };
  }

  componentDidMount() {
    let lastToken = getCookie(tokenCookieName);
    let lastUser = getCookie(usernameCookieName);
    console.log("Last User:", lastUser, ", Last token:", lastToken);
    let authed = false;
    if(lastToken!=="" && lastUser!==""){
      authed = true;
    }
    else {
      console.log("Not authed from before");
      return;
    }
    console.log("Authed from before, authed", authed);
    this.setState({
      token: lastToken, 
      username: lastUser,
      authenticated: authed
    });
  }

  render() {
    const setToken = (tok, name)=>{
      document.cookie = tokenCookieName    + "=" + tok  + "; path=/;";
      document.cookie = usernameCookieName + "=" + name + "; path=/;";
      this.setState({token: tok, username: name, authenticated: true});
    };
    const resetToken = ()=>{
      document.cookie = tokenCookieName    + "=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/;";
      document.cookie = usernameCookieName + "=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/;";
      this.setState({token: "", username: "", authenticated: false});
    }
    // const loggedOut = ()=>{return this.state.tok===0;};
    const chatapp = (<ChatApp socketUrl={this.props.socketUrl} username={this.state.username} />);
    const loginapp = (<LoginApp tokenUrl={this.props.tokenUrl} updateToken={setToken} />);
    const navigatetologin = (<Navigate replace to="/login" />);
    const navigatetohome = (<Navigate replace to="/" />);
    const loginwidget = this.state.authenticated ? navigatetohome : loginapp;
    const homewidget = this.state.authenticated ? chatapp : navigatetologin ;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <span>
            Chat App
          </span>
        </header>
        <Routes>
          <Route path="/" element={homewidget} />
          <Route path="/login" element={loginwidget} />
          <Route path="/logout" element={
            <LogoutApp resetToken={resetToken} loggedIn={this.state.authenticated} />
          } />
        </Routes>
      </div>
    );
  }
}

export default App;
export {tokenCookieName , usernameCookieName};
