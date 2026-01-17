import { useEffect, useState, useRef } from 'react';
import './App.css';

// @ts-ignore
import { TelepartyClient } from 'teleparty-websocket-lib/lib/TelepartyClient';
// @ts-ignore
import { SocketMessageTypes } from 'teleparty-websocket-lib/lib/SocketMessageTypes';

interface Message {
  type: string;
  body: string;
  userNickname?: string;
  isSystemMessage?: boolean;
  timestamp?: number;
}

function App() {
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nickname, setNickname] = useState("");
  const [myRoomId, setMyRoomId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const myIdRef = useRef<string>(""); 
  const [showTypingLabel, setShowTypingLabel] = useState(false);
  
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const eventHandler = {
      onConnectionReady: () => { console.log("Connected!"); },
      onClose: () => { alert("Disconnected! Reload page."); },
      
      onMessage: (message: any) => {
        if (message.type === 'userId') {
            console.log("My User ID is:", message.data.userId);
            myIdRef.current = message.data.userId;
        }
        if (message.type === SocketMessageTypes.SEND_MESSAGE) {
           setMessages((prev) => [...prev, message.data]);
        }
        if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
            const typingList = message.data.usersTyping || [];
            const othersTyping = typingList.filter((id: string) => id !== myIdRef.current);          
            setShowTypingLabel(othersTyping.length > 0);
        }
      }
    };

    const newClient = new TelepartyClient(eventHandler);
    setClient(newClient);
  }, []); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setMessageInput(text);
      if (!client) return;

      if (!isTypingRef.current && text.length > 0) {
          isTypingRef.current = true;
          client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, { typing: true });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, { typing: false });
      }, 2000); 
  };

  const handleCreateRoom = async () => {
    if (!nickname) return alert("Enter nickname!");
    const roomId = await client.createChatRoom(nickname);
    setMyRoomId(roomId);
  };

  const handleJoinRoom = async () => {
    const idToJoin = prompt("Enter Room ID to join:");
    if (!idToJoin || !nickname) return;
    const result = await client.joinChatRoom(nickname, idToJoin);
    setMyRoomId(idToJoin);
    if (result.messages) setMessages(result.messages);
  };

  const handleSendMessage = () => {
    if (!messageInput) return;
    client.sendMessage(SocketMessageTypes.SEND_MESSAGE, { body: messageInput });
    setMessageInput("");
    
    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, { typing: false });
  };

  if (!myRoomId) {
    return (
      <div className="app-container">
        <h1>Teleparty Chat</h1>
        <div className="lobby-box">
          <h3>Step 1: Identity</h3>
          <input 
            placeholder="Enter Nickname" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <br /><br />
          <div className="buttons">
            <button onClick={handleCreateRoom}>Create New Room</button>
            <span style={{margin: '0 10px'}}>OR</span>
            <button onClick={handleJoinRoom}>Join Existing Room</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="chat-header">
        <h2>Room: {myRoomId}</h2>
        <p>You are: <b>{nickname}</b></p>
      </div>

      <div className="chat-history" style={{ 
          height: '400px', 
          overflowY: 'auto', 
          border: '1px solid #333',
          padding: '10px',
          textAlign: 'left',
          background: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong style={{ color: msg.isSystemMessage ? 'yellow' : '#646cff' }}>
              {msg.userNickname || "System"}: 
            </strong> 
            <span style={{ marginLeft: '8px' }}>{msg.body}</span>
          </div>
        ))}
        
        {showTypingLabel && (
            <div style={{ fontStyle: 'italic', color: '#888', marginTop: 'auto' }}>
                Someone is typing...
            </div>
        )}
      </div>

      <div className="chat-input" style={{ marginTop: '10px', display: 'flex' }}>
        <input 
          style={{ flex: 1, padding: '10px' }}
          placeholder="Type a message..."
          value={messageInput}
          onChange={handleInputChange} 
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage} style={{ marginLeft: '10px' }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;