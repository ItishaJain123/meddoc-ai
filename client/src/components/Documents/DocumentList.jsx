import styles from './DocumentList.module.css';

const STATUS_CONFIG = {
  PROCESSING: { label: 'Processing...', className: 'processing' },
  READY:      { label: 'Ready',         className: 'ready'       },
  FAILED:     { label: 'Failed',        className: 'failed'      },
};

function getStatusConfig(doc) {
  if (doc.status === 'FAILED' && doc.rejectionReason) {
    return { label: 'Not Medical', className: 'failed', tooltip: doc.rejectionReason };
  }
  return { ...(STATUS_CONFIG[doc.status] || STATUS_CONFIG.PROCESSING), tooltip: null };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function FileIcon({ type }) {
  if (type === 'application/pdf') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function DocumentList({ documents, onDelete, onReextract, reextractingIds = new Set() }) {
  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <p>No documents uploaded yet.</p>
        <p>Upload a PDF or image to get started.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {documents.map((doc) => {
        const status = getStatusConfig(doc);
        return (
          <li key={doc.id} className={styles.item}>
            <div className={styles.iconWrap}>
              <FileIcon type={doc.fileType} />
            </div>
            <div className={styles.info}>
              <span className={styles.name} title={doc.fileName}>{doc.fileName}</span>
              <span className={styles.meta}>
                {formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                {doc.pageCount ? ` · ${doc.pageCount} page${doc.pageCount > 1 ? 's' : ''}` : ''}
              </span>
              {status.tooltip && <span className={styles.rejection}>{status.tooltip}</span>}
            </div>
            <span className={`${styles.badge} ${styles[status.className]}`}>{status.label}</span>
            {doc.status === 'READY' && onReextract && (
              <button
                className={styles.reextractBtn}
                onClick={() => onReextract(doc.id)}
                disabled={reextractingIds.has(doc.id)}
                title="Re-extract findings (use if Medications page is empty)"
              >
                {reextractingIds.has(doc.id) ? 'Extracting...' : 'Re-extract'}
              </button>
            )}
            {doc.status === 'PROCESSING' ? (
              <button
                className={styles.cancelBtn}
                onClick={() => onDelete(doc.id)}
                title="Cancel processing"
              >
                Cancel
              </button>
            ) : (
              <button
                className={styles.deleteBtn}
                onClick={() => onDelete(doc.id)}
                title="Delete document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default DocumentList;
