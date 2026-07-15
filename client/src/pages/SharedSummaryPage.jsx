import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Timer, FileText } from 'lucide-react';
import styles from './SharedSummaryPage.module.css';

const API_URL = import.meta.env.VITE_API_URL;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function SharedSummaryPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'This link is invalid or has expired.');
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.expired}>
          <Timer size={30} strokeWidth={1.5} />
          <h1>Link unavailable</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${92 - (i % 3) * 14}%` }} />
          ))}
        </div>
      </div>
    );
  }

  // Latest value per metric, abnormal first
  const rows = Object.entries(data.metrics)
    .map(([name, points]) => ({ name, latest: points[points.length - 1] }))
    .sort((a, b) => {
      const rank = (m) => (m.latest.isCritical ? 0 : m.latest.isAbnormal ? 1 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>MedDoc AI — Shared health summary</p>
            <h1 className={styles.title}>{data.patientName}</h1>
            <p className={styles.meta}>
              Generated {formatDate(data.generatedAt)} · Link expires {formatDate(data.expiresAt)}
            </p>
          </div>
          <div className={styles.readonly}><ShieldCheck size={14} /> Read-only</div>
        </header>

        {/* Reports */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reports on file</h2>
          <ul className={styles.docList}>
            {data.documents.map((d) => (
              <li key={d.fileName}><FileText size={13} /> {d.fileName} <span>({formatDate(d.createdAt)})</span></li>
            ))}
          </ul>
        </section>

        {/* Latest values */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Latest lab values</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Metric</th><th>Latest value</th><th>Normal range</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {rows.map(({ name, latest }) => (
                  <tr key={name}>
                    <td className={styles.metricCell}>{name}</td>
                    <td>{latest.value} {latest.unit || ''}</td>
                    <td>{latest.refRangeLow != null && latest.refRangeHigh != null ? `${latest.refRangeLow} – ${latest.refRangeHigh}` : '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${latest.isCritical ? styles.badgeCritical : latest.isAbnormal ? styles.badgeAbnormal : styles.badgeNormal}`}>
                        {latest.isCritical ? 'Critical' : latest.isAbnormal ? 'Abnormal' : 'Normal'}
                      </span>
                    </td>
                    <td className={styles.dateCell}>{formatDate(latest.reportDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Findings */}
        {data.findings.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Clinical findings & medications</h2>
            <ul className={styles.findingList}>
              {data.findings.map((f, i) => (
                <li key={i}>
                  <span className={styles.findingType}>{f.documentType}</span>
                  {f.finding}
                  <span className={styles.findingDate}> — {formatDate(f.reportDate)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className={styles.footer}>
          <strong>Medical disclaimer:</strong> This summary is informational only, generated from
          patient-uploaded documents, and does not replace professional medical advice.
        </footer>
      </div>
    </div>
  );
}

export default SharedSummaryPage;
