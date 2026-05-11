import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useChat } from '../hooks/useChat';
import { fetchConversations } from '../services/chatService';
import MessageBubble from '../components/Chat/MessageBubble';
import ChatInput from '../components/Chat/ChatInput';
import styles from './SmartChatPage.module.css';

const SUGGESTIONS = [
  { icon: '🩸', text: 'What are my blood sugar levels?' },
  { icon: '🫁', text: 'What does my X-ray show?' },
  { icon: '💊', text: 'What medication was prescribed and what is it for?' },
  { icon: '⚠️', text: 'Are any of my test results abnormal?' },
  { icon: '📊', text: 'Give me a summary of my latest blood test' },
  { icon: '🫀', text: 'What do my cholesterol levels mean?' },
];

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.lang = 'en-IN';
  window.speechSynthesis.speak(utt);
}
function stopSpeaking() { window.speechSynthesis?.cancel(); }

function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SmartChatPage() {
  const { getToken } = useAuth();
  const { messages, loading, error, sendMessage, loadConversation, startNewChat, removeConversation } = useChat();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (!ttsEnabled) return;
    if (messages.length > prevMsgCount.current) {
      const last = messages[messages.length - 1];
      if (last?.role === 'ASSISTANT') speak(last.content);
    }
    prevMsgCount.current = messages.length;
  }, [messages, ttsEnabled]);

  useEffect(() => {
    fetchConversations(getToken).then(setConversations).catch(console.error);
  }, [getToken, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSelect(id) {
    setActiveId(id);
    setSidebarOpen(false);
    await loadConversation(id);
  }

  async function handleDelete(id) {
    await removeConversation(id);
    setConversations((p) => p.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  }

  function handleNewChat() {
    startNewChat();
    setActiveId(null);
    setSidebarOpen(false);
  }

  function handleSuggestion(text) {
    sendMessage(text);
  }

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className={styles.container}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHead}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>🧬</span>
            <span className={styles.brandName}>MedDoc AI</span>
          </div>
          <button className={styles.newChatBtn} onClick={handleNewChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
        </div>

        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.noConvs}>
              <span>💬</span>
              <p>No conversations yet</p>
              <p>Start by asking a question</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`${styles.convItem} ${conv.id === activeId ? styles.activeConv : ''}`}
                onClick={() => handleSelect(conv.id)}
              >
                <div className={styles.convIcon}>💬</div>
                <div className={styles.convBody}>
                  <div className={styles.convTitle}>{conv.title}</div>
                  <div className={styles.convMeta}>{timeAgo(conv.updatedAt)}</div>
                </div>
                <button
                  className={styles.convDelete}
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat Area ── */}
      <div className={styles.chatArea}>

        {/* Toolbar / header */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className={styles.toolbarTitle}>
              <span className={styles.aiDot} />
              <span>{activeConv ? activeConv.title : 'Smart Chat'}</span>
            </div>
          </div>
          <button
            className={`${styles.ttsBtn} ${ttsEnabled ? styles.ttsBtnOn : ''}`}
            onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking(); }}
          >
            {ttsEnabled ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                Read Aloud: ON
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
                Read Aloud
              </>
            )}
          </button>
        </div>

        {/* Messages or empty state */}
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyGlow}>
              <div className={styles.emptyIconWrap}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
            </div>
            <h2 className={styles.emptyTitle}>Ask about your medical documents</h2>
            <p className={styles.emptySub}>Upload reports first, then ask anything about your health</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s.text} className={styles.chip} onClick={() => handleSuggestion(s.text)}>
                  <span className={styles.chipIcon}>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
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
                <div className={styles.thinkingAvatar}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <div className={styles.thinkingBubble}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && <div className={styles.errorMsg}>{error}</div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}

export default SmartChatPage;
