import styles from './MessageBubble.module.css';

function BotAvatar() {
  return (
    <div className={styles.avatar}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className={styles.avatar}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  );
}

function MessageBubble({ message, onSpeak }) {
  const isUser = message.role === 'USER';

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.userWrapper : styles.assistantWrapper}`}>
      {!isUser && <BotAvatar />}

      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
        <p className={styles.content}>{message.content}</p>

        {!isUser && (message.sources?.length > 0 || onSpeak) && (
          <div className={styles.footer}>
            {message.sources?.length > 0 && (
              <div className={styles.sources}>
                <span className={styles.sourcesLabel}>Sources:</span>
                {message.sources.map((src) => (
                  <span key={src.documentId} className={styles.sourceTag}>
                    {src.fileName}
                  </span>
                ))}
              </div>
            )}
            {onSpeak && (
              <button className={styles.speakBtn} onClick={onSpeak} title="Read aloud">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && <UserAvatar />}
    </div>
  );
}

export default MessageBubble;
