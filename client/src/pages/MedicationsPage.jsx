import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { fetchMedications } from '../services/medicationService';
import styles from './MedicationsPage.module.css';

function PillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
      <circle cx="18" cy="18" r="4"/>
      <path d="m15.5 15.5 5 5"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <PillIcon />
      </div>
      <h3>No medications found</h3>
      <p>Upload a prescription document and your medications will appear here automatically.</p>
    </div>
  );
}

function MedCard({ med }) {
  const lines = med.finding
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const date = med.reportDate
    ? new Date(med.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <PillIcon />
        </div>
        <div className={styles.cardMeta}>
          {date && (
            <span className={styles.metaItem}>
              <CalendarIcon /> {date}
            </span>
          )}
          {med.documentName && (
            <span className={styles.metaItem}>
              <DocIcon /> {med.documentName}
            </span>
          )}
        </div>
      </div>
      <ul className={styles.medList}>
        {lines.map((line, i) => (
          <li key={i} className={styles.medItem}>
            {line.replace(/^[-•*]\s*/, '')}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MedicationsPage() {
  const { getToken } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMedications(getToken)
      .then(setMedications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [getToken]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Medications</h1>
          <p className={styles.subtitle}>All medications extracted from your prescription documents</p>
        </div>
        <div className={styles.badge}>{medications.length} prescription{medications.length !== 1 ? 's' : ''}</div>
      </div>

      {loading && (
        <div className={styles.grid}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.card} ${styles.skeleton}`}>
              <div className={styles.skeletonHeader} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} style={{ width: '70%' }} />
              <div className={styles.skeletonLine} style={{ width: '85%' }} />
            </div>
          ))}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && medications.length === 0 && <EmptyState />}

      {!loading && !error && medications.length > 0 && (
        <div className={styles.grid}>
          {medications.map((med) => (
            <MedCard key={med.id} med={med} />
          ))}
        </div>
      )}
    </div>
  );
}
