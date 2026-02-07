import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MdChat, MdClose } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { subscribeToGlobalSettings } from '../services/settingsService';
import '../styles/ChatWidget.css';

const CHAT_BASE_URL = process.env.REACT_APP_CHAT_URL || 'https://go-ws-socket.vercel.app/';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Build iframe URL with nickname and user_id params
  const chatUrl = useMemo(() => {
    const url = new URL(CHAT_BASE_URL);
    if (user?.uid) url.searchParams.set('user_id', user.uid);
    if (user?.displayName) url.searchParams.set('nickname', user.displayName);
    return url.toString();
  }, [user?.uid, user?.displayName]);

  // Subscribe to global settings
  useEffect(() => {
    const unsubscribe = subscribeToGlobalSettings((settings) => {
      setIsEnabled(!!settings.chatEnabled);
      if (settings.chatEnabled === false) {
        setIsOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for postMessage from chat iframe for unread count
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'chat-unread-count') {
        setUnreadCount(event.data.count || 0);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Reset unread count when chat is opened
  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        // Opening chat — reset unread
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`chat-widget-fab ${isOpen ? 'hidden' : ''}`}
        onClick={toggleChat}
        aria-label="Open Chat"
      >
        <MdChat size={28} />
        {unreadCount > 0 && (
          <span className="chat-widget-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
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
            src={chatUrl}
            title="Chat"
            className="chat-iframe"
            allow="camera; microphone;"
          />
        </div>
      </div>
    </>
  );
}
