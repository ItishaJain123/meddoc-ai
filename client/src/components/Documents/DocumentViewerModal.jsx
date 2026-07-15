import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { X, FileText } from 'lucide-react';
import { fetchDocumentContent } from '../../services/documentService';
import styles from './DocumentViewerModal.module.css';

/**
 * Find the passage to highlight: try progressively shorter prefixes of the
 * cited snippet until one matches the document text (extraction can differ
 * slightly in whitespace).
 */
function findHighlightRange(text, snippet) {
  if (!snippet) return null;
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const cleanText = clean(text);
  const cleanSnippet = clean(snippet);

  for (const len of [cleanSnippet.length, 160, 100, 60, 30]) {
    const probe = cleanSnippet.slice(0, len);
    if (probe.length < 15) break;
    const idx = cleanText.indexOf(probe);
    if (idx !== -1) return { cleanText, start: idx, end: idx + probe.length };
  }
  return null;
}

function DocumentViewerModal({ documentId, fileName, highlight, onClose }) {
  const { getToken } = useAuth();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const markRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchDocumentContent(documentId, getToken)
      .then((d) => { if (!cancelled) setDoc(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [documentId, getToken]);

  useEffect(() => {
    if (doc && markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [doc]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let body = null;
  if (error) {
    body = <p className={styles.error}>{error}</p>;
  } else if (!doc) {
    body = (
      <div className={styles.skeletonWrap}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skeletonLine} style={{ width: `${90 - (i % 4) * 12}%` }} />
        ))}
      </div>
    );
  } else {
    const range = findHighlightRange(doc.text, highlight);
    if (range) {
      body = (
        <pre className={styles.text}>
          {range.cleanText.slice(0, range.start)}
          <mark ref={markRef} className={styles.mark}>
            {range.cleanText.slice(range.start, range.end)}
          </mark>
          {range.cleanText.slice(range.end)}
        </pre>
      );
    } else {
      body = <pre className={styles.text}>{doc.text}</pre>;
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <span className={styles.headIcon}><FileText size={16} /></span>
            <div>
              <h3 className={styles.headTitle}>{fileName}</h3>
              {highlight && <p className={styles.headSub}>Cited passage is highlighted</p>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.body}>{body}</div>
      </div>
    </div>
  );
}

export default DocumentViewerModal;
