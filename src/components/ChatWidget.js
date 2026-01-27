import React, { useState } from 'react';
import { MdChat, MdClose } from 'react-icons/md';
import '../styles/ChatWidget.css';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`chat-widget-fab ${isOpen ? 'hidden' : ''}`}
        onClick={toggleChat}
        aria-label="Open Chat"
      >
        <MdChat size={28} />
      </button>

      {/* Persistent Iframe Container */}
      <div className={`chat-widget-overlay ${isOpen ? 'visible' : 'hidden'}`}>
        <div className="chat-widget-header">
          <span className="chat-title">Live Chat</span>
          <button className="chat-close-btn" onClick={toggleChat} aria-label="Minimize Chat">
            <MdClose size={24} />
          </button>
        </div>
        <div className="chat-widget-iframe-container">
          <iframe
            src="https://go-ws-socket.vercel.app/"
            title="Chat"
            className="chat-iframe"
            allow="camera; microphone;"
          />
        </div>
      </div>
    </>
  );
}
