import { Sparkles, Loader2 } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import UploadZone from '../components/Documents/UploadZone';
import DocumentList from '../components/Documents/DocumentList';
import Toast from '../components/Toast/Toast';
import styles from './DocumentsPage.module.css';

function DocumentsPage() {
  const { documents, loading, uploading, error, upload, remove, reextract, reextractingIds, retry, retryingIds, confirmIdentity, confirmingIds, toasts, removeToast, seedDemo, clearDemo, seeding } = useDocuments();

  const hasDemo = documents.some((d) => d.fileName.startsWith('Sample — '));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>My Documents</h1>
          <p>Upload your medical reports to get AI-powered answers.</p>
        </div>
        {!loading && !hasDemo && (
          <button className={styles.demoBtn} onClick={seedDemo} disabled={seeding}>
            {seeding ? <Loader2 size={15} className={styles.spin} /> : <Sparkles size={15} />}
            {seeding ? 'Loading sample data…' : 'Try with sample data'}
          </button>
        )}
      </div>

      {hasDemo && (
        <div className={styles.sampleBanner}>
          <p>
            You're viewing <strong>sample data</strong> — the dashboard, trends and chat are powered by
            demo reports so you can explore. Upload your own report anytime, or clear the samples.
          </p>
          <button className={styles.clearSampleBtn} onClick={clearDemo} disabled={seeding}>
            {seeding ? 'Clearing…' : 'Clear sample data'}
          </button>
        </div>
      )}

      <UploadZone onUpload={upload} uploading={uploading} />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2>Uploaded Documents</h2>
          <span className={styles.count}>{documents.length} / 10</span>
        </div>

        {loading ? (
          <div className={styles.docSkeletons}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.docSkeleton} />)}
          </div>
        ) : (
          <DocumentList documents={documents} onDelete={remove} onReextract={reextract} reextractingIds={reextractingIds} onRetry={retry} retryingIds={retryingIds} onConfirmIdentity={confirmIdentity} confirmingIds={confirmingIds} />
        )}
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default DocumentsPage;
