import { useState, useRef, useEffect } from 'react';
import styles from './ChatInput.module.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function toggleVoice() {
    if (!SpeechRecognition) {
      alert('Voice input is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    // Support multiple languages — browser uses device locale
    rec.lang = navigator.language || 'en-IN';

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setValue(transcript);
      setListening(false);
      // Auto-focus textarea so user can review before sending
      setTimeout(() => textareaRef.current?.focus(), 100);
    };

    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <button
        type="button"
        className={`${styles.voiceBtn} ${listening ? styles.voiceBtnActive : ''}`}
        onClick={toggleVoice}
        disabled={disabled}
        title={listening ? 'Stop listening' : 'Speak your question'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      <textarea
        ref={textareaRef}
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={listening ? 'Listening...' : 'Ask a question — or click 🎤 to speak...'}
        disabled={disabled}
        rows={1}
      />
      <button
        type="submit"
        className={styles.sendBtn}
        disabled={disabled || !value.trim()}
        title="Send (Enter)"
      >
        {disabled ? <span className={styles.spinner} /> : '➤'}
      </button>
    </form>
  );
}

export default ChatInput;
