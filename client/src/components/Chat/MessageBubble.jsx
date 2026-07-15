import styles from './MessageBubble.module.css';

function AiAvatar() {
  return (
    <div className={styles.avatarAi}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className={styles.avatarUser}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  );
}

// Inline tokens the model produces: **bold**, *italic* / _italic_, and citations.
// File names can contain parentheses — e.g. "Blood Test (Jun 2026).pdf" — so the
// citation value may include one level of nested ( ) pairs.
const INLINE_RE =
  /\*\*([^*]+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_|\(Source:\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

/** Render one line of text, turning inline markdown and citations into React nodes. */
function renderInline(text, keyPrefix, onCitation) {
  const nodes = [];
  let last = 0;
  let match;
  let n = 0;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${n++}`;
    if (match[1] !== undefined) {
      nodes.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2] !== undefined || match[3] !== undefined) {
      nodes.push(<em key={key}>{match[2] ?? match[3]}</em>);
    } else {
      const fileName = match[4].trim();
      nodes.push(
        onCitation ? (
          <button
            key={key}
            className={styles.citation}
            onClick={() => onCitation(fileName)}
            title={`Open ${fileName}`}
          >
            {fileName}
          </button>
        ) : fileName
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Render assistant text as light markdown: paragraphs, bullet lists, bold/italic,
 * and clickable citation chips. Kept dependency-free and tolerant of half-streamed
 * text (an unclosed `**` stays literal until its closing marker arrives).
 */
function renderRichText(content, onCitation) {
  const blocks = [];
  let list = null;
  const flushList = () => {
    if (list) {
      blocks.push(<ul key={`ul-${blocks.length}`} className={styles.mdList}>{list}</ul>);
      list = null;
    }
  };

  content.split('\n').forEach((line, idx) => {
    const bullet = /^\s*[-*]\s+(.*)/.exec(line);
    if (bullet) {
      (list ??= []).push(
        <li key={`li-${idx}`}>{renderInline(bullet[1], `li-${idx}`, onCitation)}</li>
      );
      return;
    }
    flushList();
    if (line.trim() === '') return;
    blocks.push(
      <p key={`p-${idx}`} className={styles.mdParagraph}>{renderInline(line, `p-${idx}`, onCitation)}</p>
    );
  });
  flushList();
  return blocks;
}

function MessageBubble({ message, onSpeak, onCitation }) {
  const isUser = message.role === 'USER';

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.userWrapper : styles.assistantWrapper}`}>
      {!isUser && <AiAvatar />}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
        <div className={styles.content}>
          {isUser ? message.content : renderRichText(message.content, onCitation)}
          {message.streaming && <span className={styles.cursor} />}
        </div>
        {!isUser && !message.streaming && (message.sources?.length > 0 || onSpeak) && (
          <div className={styles.footer}>
            {message.sources?.length > 0 && (
              <div className={styles.sources}>
                <span className={styles.sourcesLabel}>Sources:</span>
                {message.sources.map((src) => (
                  <button
                    key={src.documentId}
                    className={styles.sourceTag}
                    onClick={() => onCitation?.(src.fileName, src)}
                    title={`Open ${src.fileName}`}
                  >
                    {src.fileName}
                  </button>
                ))}
              </div>
            )}
            {onSpeak && (
              <button className={styles.speakBtn} onClick={onSpeak} title="Read aloud">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
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
