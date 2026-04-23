import { useRef } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import styles from './SummaryPage.module.css';

function StatusBadge({ status }) {
  const map = {
    'Good': styles.good,
    'Needs Attention': styles.warning,
    'Critical': styles.critical,
  };
  return <span className={`${styles.badge} ${map[status] || styles.warning}`}>{status}</span>;
}

function SummaryPage() {
  const { summary, summaryLoading, summaryError, generateSummary } = useMetrics();
  const printRef = useRef(null);

  function handlePrint() {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Health Summary</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 30px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1a56a0; font-size: 20px; border-bottom: 2px solid #1a56a0; padding-bottom: 8px; }
        h2 { color: #1a56a0; font-size: 14px; margin: 18px 0 8px; }
        .badge { display:inline-block; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px; }
        .good { background:#dcfce7; color:#166534; }
        .warning { background:#fef9c3; color:#854d0e; }
        .critical { background:#fee2e2; color:#991b1b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #1a56a0; color: #fff; padding: 6px 10px; text-align: left; font-size: 12px; }
        td { padding: 5px 10px; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
        .red { color: #dc2626; font-weight: bold; }
        .disclaimer { background: #fef9c3; border-left: 4px solid #f59e0b; padding: 8px 12px; font-size: 11px; margin-top: 20px; }
        ul { padding-left: 1.2rem; font-size: 12px; line-height: 1.8; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Health Summary</h1>
          <p>Generate an AI summary of all your reports — printable and shareable with your doctor.</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.generateBtn}
            onClick={generateSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? 'Generating...' : summary ? 'Regenerate' : 'Generate Summary'}
          </button>
          {summary && (
            <button className={styles.printBtn} onClick={handlePrint}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {summaryError && <div className={styles.error}>{summaryError}</div>}

      {!summary && !summaryLoading && (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h2>No summary yet</h2>
          <p>Click "Generate Summary" to create an AI-powered health briefing from all your uploaded documents.</p>
        </div>
      )}

      {summaryLoading && (
        <div className={styles.generating}>
          <div className={styles.spinner} />
          <p>Analysing all your documents... this may take a moment.</p>
        </div>
      )}

      {summary && (
        <div className={styles.summaryWrapper} ref={printRef}>
          <div className={styles.summaryHeader}>
            <div>
              <h1>Health Summary Report</h1>
              <p>Patient: <strong>{summary.patientName}</strong></p>
              <p>Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
              <p>Documents analysed: {summary.documentCount}</p>
            </div>
            <StatusBadge status={summary.overallStatus} />
          </div>

          <div className={styles.section}>
            <h2>Overview</h2>
            <p className={styles.summaryText}>{summary.summary}</p>
          </div>

          {summary.criticalAlerts?.length > 0 && (
            <div className={`${styles.section} ${styles.criticalSection}`}>
              <h2>🚨 Critical Alerts</h2>
              <table className={styles.table}>
                <thead><tr><th>Metric</th><th>Value</th><th>What it means</th></tr></thead>
                <tbody>
                  {summary.criticalAlerts.map((a, i) => (
                    <tr key={i}>
                      <td className={styles.red}>{a.metric}</td>
                      <td className={styles.red}>{a.value}</td>
                      <td>{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.abnormalFindings?.length > 0 && (
            <div className={styles.section}>
              <h2>Abnormal Findings</h2>
              <table className={styles.table}>
                <thead><tr><th>Metric</th><th>Your Value</th><th>Reference Range</th><th>Significance</th></tr></thead>
                <tbody>
                  {summary.abnormalFindings.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.metric}</strong></td>
                      <td>{f.value}</td>
                      <td>{f.referenceRange}</td>
                      <td>{f.significance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.medications?.length > 0 && (
            <div className={styles.section}>
              <h2>Current Medications</h2>
              <table className={styles.table}>
                <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr></thead>
                <tbody>
                  {summary.medications.map((m, i) => (
                    <tr key={i}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.dosage || '—'}</td>
                      <td>{m.frequency || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.questionsForDoctor?.length > 0 && (
            <div className={styles.section}>
              <h2>Questions to Ask Your Doctor</h2>
              <ul>
                {summary.questionsForDoctor.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.disclaimer}>
            ⚕ {summary.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryPage;
