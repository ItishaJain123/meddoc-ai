import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { fetchDocuments } from '../services/documentService';
import styles from './ReportComparisonPage.module.css';

const API_URL = import.meta.env.VITE_API_URL;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getOutcome(a, b) {
  if (!a || !b) return 'onlyone';
  const aOk = !a.isAbnormal && !a.isCritical;
  const bOk = !b.isAbnormal && !b.isCritical;
  if (aOk && bOk) return 'stable';
  if (!aOk && bOk) return 'improved';
  if (aOk && !bOk) return 'worsened';
  return 'bothAbnormal';
}

function getChange(a, b) {
  if (!a || !b || a.value === 0) return null;
  const pct = ((b.value - a.value) / Math.abs(a.value)) * 100;
  const dir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'stable';
  return { pct: Math.abs(pct).toFixed(1), dir };
}

function StatusBadge({ point }) {
  if (!point) return <span className={styles.na}>—</span>;
  if (point.isCritical) return <span className={`${styles.badge} ${styles.badgeCritical}`}>Critical</span>;
  if (point.isAbnormal) return <span className={`${styles.badge} ${styles.badgeAbnormal}`}>Abnormal</span>;
  return <span className={`${styles.badge} ${styles.badgeNormal}`}>Normal</span>;
}

function ValueCell({ point, unit }) {
  if (!point) return <div className={styles.emptyCell}>Not in this report</div>;
  const color = point.isCritical ? '#ef4444' : point.isAbnormal ? '#f59e0b' : '#10b981';
  return (
    <div className={styles.valueCell}>
      <span className={styles.valueNum} style={{ color }}>{point.value}</span>
      <span className={styles.valueUnit}>{unit || point.unit}</span>
      <StatusBadge point={point} />
    </div>
  );
}

function ChangeCell({ a, b }) {
  if (!a && !b) return null;
  if (!a) return <div className={`${styles.changeCell} ${styles.changeNew}`}>New in B</div>;
  if (!b) return <div className={`${styles.changeCell} ${styles.changeGone}`}>Not in B</div>;

  const change = getChange(a, b);
  const outcome = getOutcome(a, b);

  if (!change || change.dir === 'stable') {
    return <div className={`${styles.changeCell} ${styles.changeStable}`}>↔ Stable</div>;
  }

  const outcomeClass =
    outcome === 'improved' ? styles.changeGood :
    outcome === 'worsened' ? styles.changeBad :
    change.dir === 'up' ? styles.changeUp : styles.changeDown;

  return (
    <div className={`${styles.changeCell} ${outcomeClass}`}>
      {change.dir === 'up' ? '↑' : '↓'} {change.pct}%
    </div>
  );
}

export default function ReportComparisonPage() {
  const { getToken } = useAuth();
  const { metrics, loading: metricsLoading } = useMetrics();
  const [documents, setDocuments] = useState([]);
  const [docAId, setDocAId] = useState('');
  const [docBId, setDocBId] = useState('');
  const [docsLoading, setDocsLoading] = useState(true);
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState(null);

  useEffect(() => {
    fetchDocuments(getToken)
      .then((docs) => {
        const ready = docs.filter((d) => d.status === 'READY' && d.fileType !== 'manual');
        setDocuments(ready);
      })
      .catch(console.error)
      .finally(() => setDocsLoading(false));
  }, [getToken]);

  // Auto-select a default pair once documents AND metrics are loaded: the most
  // recent two reports that share at least one metric (e.g. two blood tests).
  // Picking simply the two newest uploads can pair a prescription with a lab
  // report, which produces an empty "0 shared metrics" comparison.
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || docsLoading || metricsLoading || documents.length < 2) return;
    setAutoPicked(true);
    if (docAId || docBId) return; // user already chose something

    const metricsByDoc = new Map(); // documentId -> Set of metric names
    const reportDateByDoc = new Map(); // documentId -> latest clinical reportDate
    for (const [name, points] of Object.entries(metrics)) {
      for (const p of points) {
        let set = metricsByDoc.get(p.documentId);
        if (!set) metricsByDoc.set(p.documentId, (set = new Set()));
        set.add(name);
        if (p.reportDate) {
          const t = new Date(p.reportDate).getTime();
          const prev = reportDateByDoc.get(p.documentId);
          if (prev == null || t > prev) reportDateByDoc.set(p.documentId, t);
        }
      }
    }

    // documents are sorted newest-upload-first; default to the two newest,
    // then look for the first (most recently uploaded) pair with overlapping
    // metrics so the comparison table isn't empty
    let aId = documents[1].id;
    let bId = documents[0].id;
    outer:
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const setI = metricsByDoc.get(documents[i].id);
        const setJ = metricsByDoc.get(documents[j].id);
        if (setI && setJ && [...setJ].some((m) => setI.has(m))) {
          aId = documents[j].id;
          bId = documents[i].id;
          break outer;
        }
      }
    }

    // Orient by the clinical report date (not upload time): A = older report,
    // B = newer, so "improved/worsened" reads in the right direction
    const dateA = reportDateByDoc.get(aId);
    const dateB = reportDateByDoc.get(bId);
    if (dateA != null && dateB != null && dateA > dateB) {
      [aId, bId] = [bId, aId];
    }

    setDocAId(aId);
    setDocBId(bId);
  }, [autoPicked, docsLoading, metricsLoading, documents, metrics, docAId, docBId]);

  const docA = documents.find((d) => d.id === docAId);
  const docB = documents.find((d) => d.id === docBId);

  const rows = useMemo(() => {
    if (!docAId || !docBId) return [];
    const result = [];
    for (const [metricName, dataPoints] of Object.entries(metrics)) {
      const pointA = dataPoints.find((d) => d.documentId === docAId) ?? null;
      const pointB = dataPoints.find((d) => d.documentId === docBId) ?? null;
      if (!pointA && !pointB) continue;
      const unit = (pointA || pointB)?.unit || '';
      result.push({ metricName, pointA, pointB, unit });
    }
    return result.sort((a, b) => a.metricName.localeCompare(b.metricName));
  }, [metrics, docAId, docBId]);

  const stats = useMemo(() => {
    const improved    = rows.filter((r) => getOutcome(r.pointA, r.pointB) === 'improved').length;
    const worsened    = rows.filter((r) => getOutcome(r.pointA, r.pointB) === 'worsened').length;
    const stable      = rows.filter((r) => getOutcome(r.pointA, r.pointB) === 'stable').length;
    const onlyA       = rows.filter((r) => r.pointA && !r.pointB).length;
    const onlyB       = rows.filter((r) => !r.pointA && r.pointB).length;
    const shared      = rows.filter((r) => r.pointA && r.pointB).length;
    return { improved, worsened, stable, onlyA, onlyB, shared, total: rows.length };
  }, [rows]);

  const loading = metricsLoading || docsLoading;
  const noDocuments = !loading && documents.length < 2;
  const noMetrics   = !loading && docAId && docBId && rows.length === 0;
  const ready       = docAId && docBId && rows.length > 0;

  // Auto-generate the AI "what changed" narrative when a report pair is ready.
  // Bumping `narrativeRetry` re-runs the effect so the user can retry a failure.
  const [narrativeRetry, setNarrativeRetry] = useState(0);
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    (async () => {
      setNarrative(null);
      setNarrativeError(null);
      setNarrativeLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/metrics/compare-narrative`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ docAId, docBId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Could not generate the summary');
        }
        const data = await res.json();
        if (!cancelled) setNarrative(data.narrative);
      } catch (err) {
        if (!cancelled) setNarrativeError(err.message);
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, docAId, docBId, narrativeRetry, getToken]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Report Comparison</h1>
        <p className={styles.subtitle}>Select two reports to compare your values side by side.</p>
      </div>

      {loading && (
        <div className={styles.loadingSkeletons}>
          <div className={styles.loadingRow} />
          <div className={styles.loadingBlock} />
        </div>
      )}

      {noDocuments && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3>Not enough reports</h3>
          <p>Upload and process at least 2 medical reports to compare them.</p>
        </div>
      )}

      {!loading && documents.length >= 2 && (
        <>
          {/* Selectors */}
          <div className={styles.selectors}>
            <div className={styles.selectorCard}>
              <label className={styles.selectorLabel}>Report A</label>
              <select
                className={styles.select}
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
              >
                <option value="">Select a report...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docBId}>
                    {d.fileName} ({formatDate(d.createdAt)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.vsChip}>VS</div>

            <div className={styles.selectorCard}>
              <label className={styles.selectorLabel}>Report B</label>
              <select
                className={styles.select}
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
              >
                <option value="">Select a report...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docAId}>
                    {d.fileName} ({formatDate(d.createdAt)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI narrative */}
          {ready && (
            <div className={styles.narrativeCard}>
              <div className={styles.narrativeHead}>
                <span className={styles.narrativeIcon}><Sparkles size={15} /></span>
                <h3 className={styles.narrativeTitle}>What changed</h3>
              </div>
              {narrativeLoading && (
                <div className={styles.narrativeLoading}>
                  <Loader2 size={14} className={styles.spin} /> Reading both reports…
                </div>
              )}
              {narrativeError && (
                <p className={styles.narrativeError}>
                  {narrativeError}{' '}
                  <button className={styles.narrativeRetryBtn} onClick={() => setNarrativeRetry((n) => n + 1)}>
                    Retry
                  </button>
                </p>
              )}
              {narrative && <p className={styles.narrativeText}>{narrative}</p>}
            </div>
          )}

          {/* Stats strip */}
          {ready && (
            <div className={styles.statsStrip}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{stats.shared}</span>
                <span className={styles.statLabel}>Shared Metrics</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={`${styles.statNum} ${styles.statGreen}`}>{stats.improved}</span>
                <span className={styles.statLabel}>Improved</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={`${styles.statNum} ${styles.statRed}`}>{stats.worsened}</span>
                <span className={styles.statLabel}>Worsened</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>{stats.stable}</span>
                <span className={styles.statLabel}>Stable</span>
              </div>
              {stats.onlyA > 0 && (
                <>
                  <div className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span className={`${styles.statNum} ${styles.statMuted}`}>{stats.onlyA}</span>
                    <span className={styles.statLabel}>Only in A</span>
                  </div>
                </>
              )}
              {stats.onlyB > 0 && (
                <>
                  <div className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span className={`${styles.statNum} ${styles.statMuted}`}>{stats.onlyB}</span>
                    <span className={styles.statLabel}>Only in B</span>
                  </div>
                </>
              )}
            </div>
          )}

          {noMetrics && (
            <div className={styles.empty}>
              <h3>No shared metrics found</h3>
              <p>These two reports don't have any overlapping lab values to compare. Try selecting different reports.</p>
            </div>
          )}

          {/* Comparison table */}
          {ready && (
            <div className={styles.tableWrap}>
              {/* Table header */}
              <div className={styles.tableHeader}>
                <div className={styles.colMetric}>Metric</div>
                <div className={styles.colValue}>
                  <div className={styles.colDocName} title={docA?.fileName}>{docA?.fileName}</div>
                  <div className={styles.colDocDate}>{docA ? formatDate(docA.createdAt) : ''}</div>
                </div>
                <div className={styles.colValue}>
                  <div className={styles.colDocName} title={docB?.fileName}>{docB?.fileName}</div>
                  <div className={styles.colDocDate}>{docB ? formatDate(docB.createdAt) : ''}</div>
                </div>
                <div className={styles.colChange}>Change</div>
              </div>

              {/* Table rows */}
              <div className={styles.tableBody}>
                {rows.map((row) => {
                  const outcome = getOutcome(row.pointA, row.pointB);
                  const rowClass =
                    outcome === 'improved'     ? styles.rowImproved :
                    outcome === 'worsened'     ? styles.rowWorsened :
                    outcome === 'bothAbnormal' ? styles.rowAbnormal : '';

                  return (
                    <div key={row.metricName} className={`${styles.tableRow} ${rowClass}`}>
                      <div className={styles.colMetric}>
                        <span className={styles.metricName}>{row.metricName}</span>
                        {row.unit && <span className={styles.metricUnit}>{row.unit}</span>}
                      </div>
                      <div className={styles.colValue}>
                        <ValueCell point={row.pointA} unit={row.unit} />
                      </div>
                      <div className={styles.colValue}>
                        <ValueCell point={row.pointB} unit={row.unit} />
                      </div>
                      <div className={styles.colChange}>
                        <ChangeCell a={row.pointA} b={row.pointB} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!docAId || !docBId ? (
            <div className={styles.hint}>
              Select two reports above to see the comparison.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
