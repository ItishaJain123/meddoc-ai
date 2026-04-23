import { useRef, useState } from 'react';
import styles from './UploadZone.module.css';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

function UploadZone({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);

  function validate(file) {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only PDF, JPEG, and PNG files are allowed.';
    if (file.size > MAX_SIZE) return 'File must be under 10MB.';
    return null;
  }

  function handleFile(file) {
    const err = validate(file);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    onUpload(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.zone} ${dragOver ? styles.dragOver : ''} ${uploading ? styles.uploading : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} hidden />

        {uploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner} />
            <p>Uploading your document...</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <div className={styles.iconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className={styles.primary}>Drag & drop your file here</p>
            <p className={styles.secondary}>or <strong>click to browse</strong></p>
            <p className={styles.hint}>PDF, JPEG, PNG — max 10MB</p>
          </div>
        )}
      </div>
      {validationError && <p className={styles.error}>{validationError}</p>}
    </div>
  );
}

export default UploadZone;
