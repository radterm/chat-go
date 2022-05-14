import logo from './logo.svg';
import './App.css';
import './chat.css';
import './button.css';
import './form.css'
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";

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
    const keyPressListener = (e) => {
      // will submit on ENTER but not on SHIFT+ENTER
      if(e.which === 13 && !e.shiftKey) {
          this.handleSubmit(e);
      }
    };
    const textarea = (<textarea rows="1" value={this.state.value} placeholder="Type message here" 
                    autoFocus onChange={this.handleChange} onKeyPress={keyPressListener} />);
    
    const chatform = (
      <form onSubmit={this.handleSubmit}>
        <fieldset>          
          <div className="textarea-holder">
            {textarea}
          </div>
          <div className="chat-submit">
            <button className="arrow-right" type="submit" ></button>
          </div>
        </fieldset>
      </form>
    );

    return chatform;
  }
}

class chat {
  constructor(name, time, msg, target){
    this.name = name;
    this.time = time;
    this.msg = msg;
    this.target = target;
  }
}

function ChatMessage(props) {
  return (
    <div className="chat-message clearfix">

      <div className={"chat-message-content clearfix" + (props.me==="no"?" chat-message-content-other":"")}>

        <div className={"chat-message-header" + (props.me==="no"?" chat-message-friend-header":"") }>

          <span className="chat-time">{props.chat.time}</span>

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
      <div className="chat-history-container" ref={this.chatscrollref}>
      {
        this.props.chats.map(chat =>
          <div>
            <ChatMessage chat={chat} me={this.props.me===chat.name?"yes":"no"} />
            <hr />
          </div>
        )
      }
      </div>
    );
  }
}

function ChatAppHeader(props){
  return (<div className="chat-app-header">
    <div className="App-header-left">
      <div className="chat-app-header-back chat-app-header-elem" onClick={props.backAction}>
        <span class="material-symbols-outlined">
          arrow_back
        </span>
      </div>
    </div> 
    <div className="App-header-right">
      <div className="chat-app-header-elem">
        <span class="material-symbols-outlined">
          android_chat
        </span>
      </div>
      <div className="chat-app-header-elem">{props.name}</div>
    </div> 
  </div>);
}

class ChatApp extends React.Component {
  constructor(props){
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.socketUrl = props.socketUrl;
    this.state = {
      chats : []
    };
  }
  handleSubmit(message){
    var newchats = this.state.chats;
    var d = new Date()
    var newchat = new chat(this.props.username, d.toLocaleTimeString(), message, this.props.target);
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
    var newchat = new chat(chatMsg.name, chatMsg.time, chatMsg.msg, chatMsg.target);
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
    let chatsforthistarget = [];
    for (const x of this.state.chats) {
      if(x.target === this.props.target || x.name === this.props.target) {
        chatsforthistarget.push(x);
      }
    }
    console.log("Current chats:", chatsforthistarget);
    return (
      <div className="App">
        <ChatAppHeader name={this.props.target} backAction={this.props.backAction}></ChatAppHeader>
        <ChatHistory chats={chatsforthistarget} me={this.props.username}></ChatHistory>
        <ChatForm alertSubmit={this.handleSubmit}></ChatForm>
      </div>
    );
  }
}

function NavButton(props){
  let navigate = useNavigate();
  return (<button onClick={()=>{
    navigate(props.path);
  }}> {props.message} </button>);
}

class LoginApp extends React.Component {
  constructor(props) {
    super(props);
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
        console.log("Failed token fetch with status", response.status);
        this.authFailed();
        throw "Failed token fetch with status " + response.status;
      }
      return response.json();
    }).then(
      data => {
        console.log("Got json respose", data);
        if(data.token!=null) {
          this.updateToken(data.token, this.state.username);
        }
        else {
          this.authFailed();
        }
      },
      error => {
        console.log(error)
      }
    );
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
    this.postData(this.props.tokenUrl, formdata.get("username"), formdata.get("password"))
    this.setState({authState: "authenticating"});
    event.preventDefault();
  }

  render(){

    const switchButton = (<NavButton 
      path={this.props.logIn ? "/signup" : "/login"} 
      message={this.props.logIn ? "Sign Up" : "Log In"} 
    ></NavButton>);

    const switchWidget = (<div>
      {this.props.logIn ? "Dont have an account?" : "Already have an account?"} <br />
      {switchButton}
    </div>);

    return (
      <div className="outer-form-container">
        <div className="form-container">
          <form onSubmit={this.handleSubmit}>

            <fieldset>
              
              <input type="text" value={this.state.username} placeholder="username" 
                      autoFocus onChange={(e)=>this.handleChange('username',e)} name="username"/> <br/>
              <input type="password" value={this.state.password} onChange={(e)=>this.handleChange('password',e)}
                     name="password" placeholder="password"  /> <br />
              <button type="submit" >{this.props.logIn ? "Log In" : "Sign Up"}</button>
            </fieldset>
            <span>{this.state.authState}</span> 
          </form>

          <hr />

          <br /> <br /><br />
          {switchWidget}
        </div>
      </div>
    );
  }
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

function FriendListHeader(props){
  return (<div className="chat-app-header">
    <div className="App-header-left">
      <div className="chat-app-header-back chat-app-header-elem">
        <span>
          Friends
        </span>
      </div>
    </div> 
    <div className="App-header-right">
      <div className="chat-app-header-elem">
        <span class="material-symbols-outlined">
          android_chat
        </span>
      </div>
    </div> 
  </div>);
}

function FriendListApp(props) {
  const [friends, setFriends] = useState(null);

  useEffect(() => {
    fetch(props.friendListUrl, {
      method: 'GET',
      mode: 'cors', 
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        "Authorization": "Bearer " + props.token,
      }
    }).then((response)=>{
      if(!response.ok){
        throw "Failed token fetch with status " + response.status;
      }
      return response.json();
    }).then(
      data => {
        console.log("Got json respose", data);
        if(data.friends!=null) {
          setFriends(data.friends);
        }
      },
      error => {
        console.log(error);
      }
    );
  }, []);


  let friendListContent;
  if(friends!==null){
    friendListContent = friends.map(friend =>
      <div key={friend} className="friend" onClick={
        ()=>{
          props.setFriend(friend);
        }
      }>
        <span>{friend}</span>
        <hr />
      </div>
    );  
  } else {
    friendListContent = (
      <div className="friend friend-loading">
        <span>"Loading"</span>
        <hr />
      </div>
    );
  }
  return (
    <div className="friendList">
      <FriendListHeader />
      {friendListContent}
    </div>
  );
}


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      token: "", 
      username: "",
      authenticated: false,
      target: null
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
    const resetToken = ()=>{
      document.cookie = tokenCookieName    + "=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/;";
      document.cookie = usernameCookieName + "=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/;";
      this.setState({token: "", username: "", authenticated: false, target: null});
    }
    const setToken = (tok, name)=>{
      if(tok===0){
        resetToken();
        return;
      }
      document.cookie = tokenCookieName    + "=" + tok  + "; path=/;";
      document.cookie = usernameCookieName + "=" + name + "; path=/;";
      this.setState({token: tok, username: name, authenticated: true});
    };

    const setTarget = (name)=>{
      console.log("target acquired", name);
      this.setState({target: name});
    };
    const resetTarget = ()=>{
      console.log("Resetting target");
      this.setState({target: null});
    };

    const logOutButton = this.state.authenticated ? (
      <button className="header logout" onClick={
        ()=>{
          console.log("Resetting token");
          resetToken();
        }
      } >Logout</button>
    ) : (<span></span>);

    const chatapp = (<ChatApp 
            socketUrl={this.props.socketUrl} username={this.state.username} 
            target={this.state.target} backAction={resetTarget}
        />);
    const loginapp = (<LoginApp tokenUrl={this.props.tokenUrl} logIn={true} updateToken={setToken} />);
    const signUpapp = (<LoginApp tokenUrl={this.props.signUpUrl} logIn={false} updateToken={setToken} />);
    const friendListApp = (<FriendListApp friendListUrl={this.props.friendListUrl} token={this.state.token} setFriend={setTarget} />);
    const navigatetologin = (<Navigate replace to="/login" />);
    const navigatetohome = (<Navigate replace to="/" />);
    let loginwidget = this.state.authenticated ? navigatetohome : loginapp;
    let signupwidget = this.state.authenticated ? navigatetohome : signUpapp;
    let homewidget;
    if(!this.state.authenticated){
      homewidget = navigatetologin;
    } else if(this.state.target===null) {
      homewidget = friendListApp;
    } else{
      homewidget = chatapp;
    }
    return (
      <div className="AppContainer">
        <header className="App-header">
          <div className="App-header-left">
            <img src={logo} className="App-logo" alt="logo" />
            <span>
              Chat App
            </span>
          </div>
          <div className="App-header-right">
            {logOutButton}
          </div>
        </header>
        <Routes>
          <Route path="/" element={homewidget} />
          <Route path="/login" element={loginwidget} />
          <Route path="/signup" element={signupwidget} />
        </Routes>
      </div>
    );
  }
}

export default App;
export {tokenCookieName , usernameCookieName};
