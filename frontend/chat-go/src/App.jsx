import logo from './logo.svg';
import './App.css';
import './chat.css';
import React from 'react';

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

class App extends React.Component {
  constructor(props){
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.url = props.url;
    this.state = {
      chats : [
        // new chat("Player 1", "13:78", "Hi there!"),
        // new chat("Player 2", "14:78", "Hello, how are you?!")
      ],
      player: "Player 1"
    };
  }
  handleSubmit(message){
    var newchats = this.state.chats;
    var d = new Date()
    var newchat = new chat("Player 1", d.toLocaleTimeString(), message);
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
    console.log("Got message", newchat.msg, "from", newchat.name);
    this.setState({chats: newchats});
  }
  componentDidMount(){
    this.socket = new WebSocket(this.url);
    this.socket.onopen = function(e) {
      console.log("Connection established")
    };
    this.socket.onmessage = (e) => {
      this.handleSocketMessage(e.data)
    }
  }
  render(){
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <span>
            Chat App
          </span>
        </header>
        <ChatHistory chats={this.state.chats}></ChatHistory>
        <ChatForm alertSubmit={this.handleSubmit}></ChatForm>
      </div>
    );
  }
}

export default App;
