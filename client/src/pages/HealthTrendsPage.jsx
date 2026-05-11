import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useMetrics } from '../hooks/useMetrics';
import styles from './HealthTrendsPage.module.css';

// ── Theme-aware chart colors ──────────────────────────────────────────────────
function useChartTheme() {
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return {
    grid:         dark ? '#1e293b' : '#f1f5f9',
    axis:         dark ? '#64748b' : '#94a3b8',
    normal:       dark ? '#34d399' : '#10b981',
    abnormal:     dark ? '#fbbf24' : '#f59e0b',
    critical:     dark ? '#f87171' : '#ef4444',
    surface:      dark ? '#1e293b' : '#ffffff',
    border:       dark ? '#334155' : '#e2e8f0',
    textMuted:    dark ? '#64748b' : '#94a3b8',
  };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// Determine if the trend direction is good, bad, or neutral
function trendMeaning(latest, prev, refLow, refHigh) {
  if (!prev) return 'neutral';
  const wasOk = !prev.isAbnormal && !prev.isCritical;
  const isOk  = !latest.isAbnormal && !latest.isCritical;
  if (wasOk && isOk) return 'neutral';
  if (!wasOk && isOk) return 'good';
  if (wasOk && !isOk) return 'bad';
  if (refLow != null && refHigh != null) {
    const mid = (refLow + refHigh) / 2;
    return Math.abs(latest.value - mid) < Math.abs(prev.value - mid) ? 'good' : 'bad';
  }
  return 'neutral';
}

// ── Visual reference range bar ────────────────────────────────────────────────
function RangeBar({ value, refLow, refHigh, isCritical, isAbnormal }) {
  if (refLow == null || refHigh == null) return null;

  const buffer  = Math.max((refHigh - refLow) * 0.6, 1);
  const min     = Math.min(refLow - buffer, value - buffer * 0.3);
  const max     = Math.max(refHigh + buffer, value + buffer * 0.3);
  const span    = max - min || 1;

  const safeLow  = ((refLow  - min) / span) * 100;
  const safeHigh = ((refHigh - min) / span) * 100;
  const valPct   = Math.min(99, Math.max(1, ((value - min) / span) * 100));

  const dotColor = isCritical ? '#ef4444' : isAbnormal ? '#f59e0b' : '#10b981';

  return (
    <div className={styles.rangeBarWrap}>
      <div className={styles.rangeBar}>
        <div
          className={styles.rangeSafe}
          style={{ left: `${safeLow}%`, width: `${safeHigh - safeLow}%` }}
        />
        <div
          className={styles.rangeDot}
          style={{ left: `${valPct}%`, background: dotColor, boxShadow: `0 0 7px ${dotColor}99` }}
        />
      </div>
      <div className={styles.rangeLabels}>
        <span>{refLow}</span>
        <span className={styles.rangeSafeLabel}>Safe range</span>
        <span>{refHigh}</span>
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ name, data }) {
  const theme    = useChartTheme();
  const unit     = data[0]?.unit || '';
  const refLow   = data[0]?.refRangeLow;
  const refHigh  = data[0]?.refRangeHigh;
  const latest   = data[data.length - 1];
  const prev     = data.length > 1 ? data[data.length - 2] : null;

  const rawChange = prev ? ((latest.value - prev.value) / Math.abs(prev.value) * 100) : null;
  const change    = rawChange !== null ? rawChange.toFixed(1) : null;
  const trendDir  = change === null ? null : parseFloat(change) > 0.05 ? 'up' : parseFloat(change) < -0.05 ? 'down' : 'stable';
  const meaning   = trendMeaning(latest, prev, refLow, refHigh);

  const hasCritical = data.some((d) => d.isCritical);
  const hasAbnormal = !hasCritical && data.some((d) => d.isAbnormal);
  const status      = hasCritical ? 'critical' : hasAbnormal ? 'abnormal' : 'normal';
  const lineColor   = hasCritical ? theme.critical : hasAbnormal ? theme.abnormal : theme.normal;

  const chartData = data.map((d) => ({
    date:  formatDate(d.reportDate),
    value: d.value,
  }));

  return (
    <div className={`${styles.card} ${styles[status]}`}>
      {/* ── Card header ── */}
      <div className={styles.cardHeader}>
        <div className={styles.metricMeta}>
          <span className={styles.metricName}>{name}</span>
          {(hasCritical || hasAbnormal) && (
            <span className={`${styles.statusBadge} ${styles[status + 'Badge']}`}>
              {hasCritical ? 'Critical' : 'Abnormal'}
            </span>
          )}
        </div>
        <div className={styles.valueArea}>
          <span className={styles.valueNum} style={{ color: lineColor }}>{latest.value}</span>
          <span className={styles.valueUnit}>{unit}</span>
          {trendDir && trendDir !== 'stable' && (
            <span className={`${styles.trendBadge} ${styles['trend_' + meaning]}`}>
              {trendDir === 'up' ? '↑' : '↓'} {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>

      {/* ── Range bar ── */}
      <RangeBar
        value={latest.value}
        refLow={refLow}
        refHigh={refHigh}
        isCritical={hasCritical}
        isAbnormal={hasAbnormal}
      />

      {/* ── Chart or single-point display ── */}
      {data.length > 1 ? (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={148}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.axis }} />
              <YAxis tick={{ fontSize: 10, fill: theme.axis }} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(val) => [`${val} ${unit}`, name]}
                contentStyle={{
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ fontSize: 11, color: theme.textMuted }}
              />
              {refLow != null && (
                <ReferenceLine y={refLow} stroke={theme.abnormal} strokeDasharray="4 2"
                  label={{ value: 'Low', fontSize: 9, fill: theme.abnormal, position: 'insideTopLeft' }} />
              )}
              {refHigh != null && (
                <ReferenceLine y={refHigh} stroke={theme.abnormal} strokeDasharray="4 2"
                  label={{ value: 'High', fontSize: 9, fill: theme.abnormal, position: 'insideBottomLeft' }} />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: lineColor, stroke: 'var(--surface)', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: 'var(--surface)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={styles.singlePoint}>
          <div className={styles.singleMain}>
            <span className={styles.singleVal} style={{ color: lineColor }}>{latest.value}</span>
            <span className={styles.singleUnit}>{unit}</span>
          </div>
          {refLow != null && refHigh != null && (
            <p className={styles.singleRange}>Normal range: {refLow} – {refHigh} {unit}</p>
          )}
          <p className={styles.singleDate}>Recorded {formatDate(latest.reportDate)}</p>
          <p className={styles.singleHint}>Upload more reports to see your trend over time</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function HealthTrendsPage() {
  const { metrics, criticalAlerts, loading, error } = useMetrics();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const allNames      = Object.keys(metrics);
  const totalCritical = allNames.filter((n) => metrics[n].some((d) => d.isCritical)).length;
  const totalAbnormal = allNames.filter((n) => !metrics[n].some((d) => d.isCritical) && metrics[n].some((d) => d.isAbnormal)).length;

  const filteredNames = allNames
    .filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    .filter((n) => {
      const d = metrics[n];
      if (filter === 'critical') return d.some((x) => x.isCritical);
      if (filter === 'abnormal') return d.some((x) => x.isAbnormal || x.isCritical);
      return true;
    });

  if (loading) return <div className={styles.center}>Loading health data...</div>;

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Health Trends</h1>
          <p className={styles.subtitle}>Track your lab values across all uploaded reports over time.</p>
        </div>
      </div>

      {/* ── Critical banner ── */}
      {criticalAlerts.length > 0 && (
        <div className={styles.criticalBanner}>
          <span className={styles.bannerIcon}>🚨</span>
          <div>
            <strong className={styles.bannerTitle}>Critical Values Detected</strong>
            <ul className={styles.alertList}>
              {criticalAlerts.map((a) => (
                <li key={a.id}>
                  <strong>{a.metricName}:</strong> {a.value} {a.unit || ''} — from &ldquo;{a.document?.fileName}&rdquo; ({formatDate(a.reportDate)})
                </li>
              ))}
            </ul>
            <p className={styles.bannerNote}>Please consult your doctor immediately.</p>
          </div>
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}

      {allNames.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h2>No health data yet</h2>
          <p>Upload a blood test report to start tracking your health metrics.</p>
        </div>
      ) : (
        <>
          {/* ── Summary strip ── */}
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{allNames.length}</span>
              <span className={styles.summaryLabel}>metrics tracked</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={`${styles.summaryNum} ${styles.summaryAmber}`}>{totalAbnormal}</span>
              <span className={styles.summaryLabel}>abnormal</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={`${styles.summaryNum} ${styles.summaryRed}`}>{totalCritical}</span>
              <span className={styles.summaryLabel}>critical</span>
            </div>
          </div>

          {/* ── Controls ── */}
          <div className={styles.controls}>
            <div className={styles.filterTabs}>
              <button
                className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                data-f="all"
                onClick={() => setFilter('all')}
              >All</button>
              <button
                className={`${styles.filterTab} ${filter === 'abnormal' ? styles.filterTabActive : ''}`}
                data-f="abnormal"
                onClick={() => setFilter('abnormal')}
              >
                Abnormal {totalAbnormal + totalCritical > 0 && <span className={styles.tabCount}>{totalAbnormal + totalCritical}</span>}
              </button>
              <button
                className={`${styles.filterTab} ${filter === 'critical' ? styles.filterTabActive : ''}`}
                data-f="critical"
                onClick={() => setFilter('critical')}
              >
                Critical {totalCritical > 0 && <span className={styles.tabCount}>{totalCritical}</span>}
              </button>
            </div>
            <input
              className={styles.search}
              placeholder="Search metric (e.g. Haemoglobin, WBC...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* ── Grid ── */}
          {filteredNames.length === 0 ? (
            <div className={styles.noResults}>
              <p>No metrics match your filter.</p>
              <button className={styles.clearBtn} onClick={() => { setFilter('all'); setSearch(''); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredNames.map((name) => (
                <MetricCard key={name} name={name} data={metrics[name]} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HealthTrendsPage;
