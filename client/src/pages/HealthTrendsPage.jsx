import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { useMetrics } from '../hooks/useMetrics';
import styles from './HealthTrendsPage.module.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function MetricCard({ name, data }) {
  const unit = data[0]?.unit || '';
  const refLow = data[0]?.refRangeLow;
  const refHigh = data[0]?.refRangeHigh;
  const latest = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const change = prev ? ((latest.value - prev.value) / prev.value * 100).toFixed(1) : null;
  const trend = change === null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

  const chartData = data.map((d) => ({
    date: formatDate(d.reportDate),
    value: d.value,
    refLow: d.refRangeLow,
    refHigh: d.refRangeHigh,
  }));

  const hasCritical = data.some((d) => d.isCritical);
  const hasAbnormal = data.some((d) => d.isAbnormal);

  return (
    <div className={`${styles.card} ${hasCritical ? styles.critical : hasAbnormal ? styles.abnormal : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.metricName}>
          {hasCritical && <span className={styles.criticalBadge}>CRITICAL</span>}
          {!hasCritical && hasAbnormal && <span className={styles.abnormalBadge}>ABNORMAL</span>}
          <span>{name}</span>
        </div>
        <div className={styles.latestValue}>
          <span className={styles.valueNum}>{latest.value}</span>
          <span className={styles.valueUnit}>{unit}</span>
          {change !== null && (
            <span className={`${styles.trend} ${styles[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>

      {refLow != null && refHigh != null && (
        <p className={styles.refRange}>Reference range: {refLow} – {refHigh} {unit}</p>
      )}

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(val) => [`${val} ${unit}`, name]}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 12 }}
            />
            {refLow != null && (
              <ReferenceLine y={refLow} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Low', fontSize: 10, fill: '#f59e0b' }} />
            )}
            {refHigh != null && (
              <ReferenceLine y={refHigh} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'High', fontSize: 10, fill: '#f59e0b' }} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={hasCritical ? '#dc2626' : hasAbnormal ? '#f59e0b' : '#2563eb'}
              strokeWidth={2}
              dot={{ r: 4, fill: hasCritical ? '#dc2626' : hasAbnormal ? '#f59e0b' : '#2563eb' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className={styles.singlePoint}>
          <p>Only one data point. Upload more reports to see trends.</p>
        </div>
      )}
    </div>
  );
}

function HealthTrendsPage() {
  const { metrics, criticalAlerts, loading, error } = useMetrics();
  const [search, setSearch] = useState('');

  const metricNames = Object.keys(metrics).filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className={styles.center}>Loading health data...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Health Trends</h1>
          <p>Track your lab values across all uploaded reports over time.</p>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className={styles.criticalBanner}>
          <span className={styles.bannerIcon}>🚨</span>
          <div>
            <strong>Critical Values Detected</strong>
            <ul className={styles.alertList}>
              {criticalAlerts.map((a) => (
                <li key={a.id}>
                  <strong>{a.metricName}:</strong> {a.value} {a.unit || ''} — from "{a.document?.fileName}" ({formatDate(a.reportDate)})
                </li>
              ))}
            </ul>
            <p className={styles.bannerNote}>Please consult your doctor immediately.</p>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {metricNames.length === 0 && !loading ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h2>No health data yet</h2>
          <p>Upload medical reports to start tracking your health metrics.</p>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <input
              className={styles.search}
              placeholder="Search metric (e.g. Haemoglobin, WBC...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className={styles.count}>{metricNames.length} metric{metricNames.length !== 1 ? 's' : ''} tracked</span>
          </div>

          <div className={styles.grid}>
            {metricNames.map((name) => (
              <MetricCard key={name} name={name} data={metrics[name]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default HealthTrendsPage;
