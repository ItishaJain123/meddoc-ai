import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  pollDocumentStatus,
  reextractDocument,
} from '../services/documentService';

export function useDocuments() {
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [reextractingIds, setReextractingIds] = useState(new Set());
  const toastIdRef = useRef(0);

  function addToast(type, title, message = null) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments(getToken);
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for status updates on PROCESSING documents and fire toasts on transitions
  useEffect(() => {
    const processing = documents.filter((d) => d.status === 'PROCESSING');
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        processing.map((d) => pollDocumentStatus(d.id, getToken).catch(() => null))
      );

      setDocuments((prev) => {
        return prev.map((doc) => {
          const update = updates.find((u) => u?.id === doc.id);
          if (!update || update.status === doc.status) return doc;

          // Status transition detected
          if (update.status === 'READY') {
            addToast(
              'success',
              'Document ready!',
              `"${doc.fileName}" has been processed and is ready to chat.`
            );
          } else if (update.status === 'FAILED') {
            if (update.rejectionReason) {
              addToast(
                'error',
                'Not a medical document',
                update.rejectionReason
              );
            } else {
              addToast(
                'error',
                'Processing failed',
                `"${doc.fileName}" could not be processed. Please try again.`
              );
            }
          }

          return { ...doc, ...update };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, getToken]);

  async function upload(file) {
    setUploading(true);
    setError(null);
    try {
      const newDoc = await uploadDocument(file, getToken);
      setDocuments((prev) => [newDoc, ...prev]);
    } catch (err) {
      setError(err.message);
      addToast('error', 'Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    const doc = documents.find((d) => d.id === id);
    const wasProcessing = doc?.status === 'PROCESSING';
    try {
      await deleteDocument(id, getToken);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (wasProcessing) addToast('info', 'Processing cancelled', `"${doc.fileName}" has been removed.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function reextract(id) {
    if (reextractingIds.has(id)) return;
    setReextractingIds((prev) => new Set([...prev, id]));
    try {
      const result = await reextractDocument(id, getToken);
      addToast('success', 'Re-extraction complete', `Found ${result.findings.length} finding(s). Check the Medications page.`);
    } catch (err) {
      addToast('error', 'Re-extraction failed', err.message);
    } finally {
      setReextractingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  return { documents, loading, uploading, error, upload, remove, reextract, reextractingIds, toasts, removeToast };
}
