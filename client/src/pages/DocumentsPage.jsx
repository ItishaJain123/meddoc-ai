import { useDocuments } from '../hooks/useDocuments';
import UploadZone from '../components/Documents/UploadZone';
import DocumentList from '../components/Documents/DocumentList';
import Toast from '../components/Toast/Toast';
import styles from './DocumentsPage.module.css';

function DocumentsPage() {
  const { documents, loading, uploading, error, upload, remove, reextract, reextractingIds, toasts, removeToast } = useDocuments();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Documents</h1>
        <p>Upload your medical reports to get AI-powered answers.</p>
      </div>

      <UploadZone onUpload={upload} uploading={uploading} />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2>Uploaded Documents</h2>
          <span className={styles.count}>{documents.length} / 10</span>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading documents...</div>
        ) : (
          <DocumentList documents={documents} onDelete={remove} onReextract={reextract} reextractingIds={reextractingIds} />
        )}
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default DocumentsPage;
