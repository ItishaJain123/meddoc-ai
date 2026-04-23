import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useChat } from '../hooks/useChat';
import { fetchConversations } from '../services/chatService';
import MessageBubble from '../components/Chat/MessageBubble';
import ChatInput from '../components/Chat/ChatInput';
import styles from './SmartChatPage.module.css';

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.lang = 'en-IN';
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

function SmartChatPage() {
  const { getToken } = useAuth();
  const { messages, conversationId, loading, error, sendMessage, loadConversation, startNewChat, removeConversation } = useChat();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMessageCount = useRef(0);

  // Auto-speak new AI responses when TTS is enabled
  useEffect(() => {
    if (!ttsEnabled) return;
    if (messages.length > prevMessageCount.current) {
      const last = messages[messages.length - 1];
      if (last?.role === 'ASSISTANT') speak(last.content);
    }
    prevMessageCount.current = messages.length;
  }, [messages, ttsEnabled]);

  // Load conversation list
  useEffect(() => {
    fetchConversations(getToken).then(setConversations).catch(console.error);
  }, [getToken, conversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSelectConversation(id) {
    setActiveId(id);
    await loadConversation(id);
  }

  async function handleDelete(id) {
    await removeConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  function handleNewChat() {
    startNewChat();
    setActiveId(null);
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <button className={styles.newChatBtn} onClick={handleNewChat}>
          + New Chat
        </button>
        <div className={styles.convList}>
          {conversations.length === 0 && (
            <p className={styles.noConvs}>No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.convItem} ${conv.id === activeId ? styles.activeConv : ''}`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <div className={styles.convTitle}>{conv.title}</div>
              <div className={styles.convMeta}>
                {conv.messages[0]?.content.slice(0, 40)}...
              </div>
              <button
                className={styles.convDelete}
                onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className={styles.chatArea}>
        <div className={styles.chatToolbar}>
          <button
            className={`${styles.ttsBtn} ${ttsEnabled ? styles.ttsBtnActive : ''}`}
            onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking(); }}
            title={ttsEnabled ? 'Turn off read-aloud' : 'Turn on read-aloud'}
          >
            {ttsEnabled ? '🔊 Read Aloud: ON' : '🔇 Read Aloud: OFF'}
          </button>
        </div>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2>Ask about your medical documents</h2>
            <p>Upload documents first, then ask questions like:</p>
            <ul className={styles.examples}>
              <li>"What are my blood sugar levels?"</li>
              <li>"What does my X-ray show?"</li>
              <li>"What medication was prescribed and what is it for?"</li>
              <li>"Are any of my test results abnormal?"</li>
            </ul>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSpeak={msg.role === 'ASSISTANT' ? () => speak(msg.content) : null}
              />
            ))}
            {loading && (
              <div className={styles.thinking}>
                <div className={styles.thinkingDots}>
                  <span /><span /><span />
                </div>
                <span>MedDoc AI is thinking...</span>
              </div>
            )}
            {error && <div className={styles.error}>{error}</div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}

export default SmartChatPage;
