import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea,
  BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { fetchDashboard } from '../services/dashboardService';
import styles from './Dashboard.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return '#94a3b8';
  if (s >= 75)   return '#059669';
  if (s >= 50)   return '#d97706';
  return '#dc2626';
}

function scoreLabel(s) {
  if (s == null) return '—';
  if (s >= 75)   return 'Good';
  if (s >= 50)   return 'Moderate';
  return 'Needs Attention';
}

function severityColor(sev) {
  const map = { Normal: '#059669', Mild: '#d97706', Moderate: '#ea580c', Severe: '#dc2626', Critical: '#7f1d1d' };
  return map[sev] ?? '#94a3b8';
}

function severityBg(sev) {
  const map = { Normal: '#ecfdf5', Mild: '#fffbeb', Moderate: '#fff7ed', Severe: '#fef2f2', Critical: '#fef2f2' };
  return map[sev] ?? '#f8fafc';
}

function fileIcon(fileType) {
  if (fileType === 'application/pdf') return '📄';
  if (fileType?.startsWith('image/')) return '🖼️';
  return '📁';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, message }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyMsg}>{message}</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className={styles.statCard} style={{ '--accent': accent }}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <span className={styles.statValue}>{value ?? '—'}</span>
        <span className={styles.statLabel}>{label}</span>
        {sub && <span className={styles.statSub}>{sub}</span>}
      </div>
    </div>
  );
}

// ── Chart 1: Health Score gauge (half-circle via PieChart) ────────────────────
function HealthGauge({ score }) {
  const color  = scoreColor(score);
  const label  = scoreLabel(score);
  const filled = score ?? 0;
  const data   = [{ v: filled }, { v: 100 - filled }];

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Overall Health Score</h3>
      <p className={styles.chartSub}>How many of your blood test values are in the safe range</p>
      <div className={styles.gaugeWrap}>
        <PieChart width={220} height={120}>
          <Pie
            data={data}
            cx={110} cy={118}
            startAngle={180} endAngle={0}
            innerRadius={72} outerRadius={105}
            dataKey="v"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
        <div className={styles.gaugeCenter} style={{ color }}>
          <span className={styles.gaugeScore}>{score ?? '—'}</span>
          {score != null && <span className={styles.gaugeMax}>/100</span>}
        </div>
      </div>
      <div className={styles.gaugeBadge} style={{ background: severityBg(label === 'Good' ? 'Normal' : label === 'Moderate' ? 'Mild' : 'Severe'), color }}>
        {label}
      </div>
      {score == null && <p className={styles.chartHint}>Upload a blood test report to see your score</p>}
    </div>
  );
}

// ── Chart 2: Normal / Abnormal / Critical donut ────────────────────────────────
function BreakdownDonut({ data, total }) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Are Your Test Values Safe?</h3>
      <p className={styles.chartSub}>Out of all blood test values found in your reports</p>
      {data.length === 0 ? (
        <EmptyState icon="🔬" message="Upload a blood test report to see your results breakdown" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none" paddingAngle={3}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} test values`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.donutLegend}>
            {data.map((d) => (
              <div key={d.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: d.color }} />
                <span className={styles.legendLabel}>
                  {d.name === 'Normal'   && '✓ Safe range'}
                  {d.name === 'Abnormal' && '⚠ Slightly off'}
                  {d.name === 'Critical' && '🔴 Needs attention'}
                </span>
                <span className={styles.legendVal}>{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Chart 3: Radar — latest values per metric ──────────────────────────────────
function MetricRadar({ data }) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Body Health Map</h3>
      <p className={styles.chartSub}>Outer edge = perfect. Closer to centre = needs attention</p>
      {data.length < 3 ? (
        <EmptyState icon="🕸️" message="Upload 3 or more blood test reports to unlock this chart" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" fill="#2563eb" fillOpacity={0.25} stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
            <Tooltip formatter={(v) => [`${v} / 100`, 'How well it sits in safe range']} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Chart 4: Metric trend line ────────────────────────────────────────────────
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.ttDate}>{label}</p>
      <p className={styles.ttValue}>{d.value} {d.unit}</p>
      <p className={styles.ttStatus} style={{ color: d.isAbnormal ? '#dc2626' : '#059669' }}>
        {d.isAbnormal ? '⚠ Outside safe range' : '✓ Within safe range'}
      </p>
    </div>
  );
};

function MetricTrend({ trends, metricNames }) {
  const [selected, setSelected] = useState(metricNames[0] ?? null);
  const metric = selected ? trends[selected] : null;

  return (
    <div className={styles.chartCard}>
      <div className={styles.trendHeader}>
        <div>
          <h3 className={styles.chartTitle}>Is This Value Getting Better or Worse?</h3>
          <p className={styles.chartSub}>Green band = safe range. Red dot = outside safe range, Green dot = safe</p>
        </div>
        {metricNames.length > 0 && (
          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>Choose test:</label>
            <select
              className={styles.metricSelect}
              value={selected ?? ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {metricNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>
      {!metric ? (
        <EmptyState icon="📈" message="Upload a blood test report to track how your values change over time" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={metric.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={45} />
            <Tooltip content={<TrendTooltip />} />
            {metric.refLow != null && metric.refHigh != null && (
              <ReferenceArea y1={metric.refLow} y2={metric.refHigh} fill="#dcfce7" fillOpacity={0.5} />
            )}
            <Line
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                return (
                  <circle
                    key={index}
                    cx={cx} cy={cy} r={5}
                    fill={payload.isAbnormal ? '#dc2626' : '#059669'}
                    stroke="white" strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7, stroke: '#2563eb', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Chart 5: Top flagged metrics (horizontal bar) ─────────────────────────────
function TopFlagged({ data }) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Which Values Need Most Attention?</h3>
      <p className={styles.chartSub}>Longer bar = more reports showed this value outside the safe range</p>
      {data.length === 0 ? (
        <EmptyState icon="✅" message="All your test values are within the safe range — great job!" />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} label={{ value: 'times outside safe range', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
            <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11, fill: '#475569' }} />
            <Tooltip formatter={(v) => [`${v} time${v !== 1 ? 's' : ''}`, 'Outside safe range']} />
            <Bar dataKey="abnormal" fill="#f97316" radius={[0, 5, 5, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Chart 6: Upload activity bar chart ────────────────────────────────────────
function UploadActivity({ data }) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Your Monitoring Habit</h3>
      <p className={styles.chartSub}>How many reports you uploaded each month — taller bar = more active monitoring</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip formatter={(v) => [`${v} report${v !== 1 ? 's' : ''}`, 'Uploaded']} />
          <Bar dataKey="count" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Document findings cards ───────────────────────────────────────────────────
function FindingCard({ finding }) {
  const color = severityColor(finding.severity);
  const bg    = severityBg(finding.severity);
  return (
    <div className={styles.findingCard}>
      <div className={styles.findingTop}>
        <span className={styles.findingType}>{finding.documentType}</span>
        {finding.bodyPart && <span className={styles.findingBody}>{finding.bodyPart}</span>}
        <span className={styles.findingBadge} style={{ color, background: bg }}>{finding.severity}</span>
      </div>
      <p className={styles.findingText}>{finding.finding}</p>
      <div className={styles.findingMeta}>
        <span>{finding.documentName}</span>
        <span>{new Date(finding.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard() {
  const { user }      = useUser();
  const { getToken }  = useAuth();
  const navigate      = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard(getToken)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.name}>{user?.firstName || 'there'}</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => navigate('/documents')}>Upload Report</button>
          <button className={styles.btnPrimary}   onClick={() => navigate('/chat')}>Ask the AI</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : !data ? (
        <EmptyState icon="⚠️" message="Could not load dashboard. Please try refreshing." />
      ) : (
        <>
          {/* ── Stats row ── */}
          <div className={styles.statsRow}>
            <StatCard label="Documents"    value={data.stats.totalDocuments}   accent="#2563eb" icon="📄" />
            <StatCard label="Lab Metrics"  value={data.stats.totalMetrics}     accent="#0d9488" icon="🔬" />
            <StatCard label="Abnormal"     value={data.stats.abnormalCount}    accent="#d97706" icon="⚠️"
              sub={data.stats.criticalCount > 0 ? `${data.stats.criticalCount} critical` : null} />
            <StatCard label="AI Chats"     value={data.stats.conversationCount} accent="#7c3aed" icon="💬" />
          </div>

          {/* ── Critical alert ── */}
          {data.stats.criticalCount > 0 && (
            <div className={styles.alertBanner} onClick={() => navigate('/trends')}>
              <div className={styles.alertLeft}>
                <span className={styles.alertDot} />
                <div>
                  <p className={styles.alertTitle}>Critical Values Detected</p>
                  <p className={styles.alertSub}>{data.stats.criticalCount} metric{data.stats.criticalCount > 1 ? 's require' : ' requires'} immediate attention</p>
                </div>
              </div>
              <span className={styles.alertArrow}>Review →</span>
            </div>
          )}

          {/* ── Charts row 1: Gauge + Donut + Radar ── */}
          <div className={styles.row3}>
            <HealthGauge score={data.healthScore} />
            <BreakdownDonut data={data.metricsBreakdown} total={data.stats.totalMetrics} />
            <MetricRadar data={data.radarData} />
          </div>

          {/* ── Chart row 2: Trend line (full width) ── */}
          <MetricTrend trends={data.trends} metricNames={data.metricNames} />

          {/* ── Charts row 3: Top flagged + Upload activity ── */}
          <div className={styles.row2}>
            <TopFlagged data={data.topFlagged} />
            <UploadActivity data={data.uploadActivity} />
          </div>

          {/* ── Document findings ── */}
          {data.findings.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Imaging &amp; Clinical Findings</h2>
              <p className={styles.sectionSub}>From X-rays, sonography, prescriptions &amp; other reports</p>
              <div className={styles.findingsGrid}>
                {data.findings.map((f) => <FindingCard key={f.id} finding={f} />)}
              </div>
            </div>
          )}

          {/* ── Recent activity ── */}
          <div className={styles.row2}>
            <div className={styles.recentCard}>
              <h3 className={styles.recentTitle}>Recent Documents</h3>
              {data.recentDocuments.length === 0 ? (
                <EmptyState icon="📂" message="No documents uploaded yet" />
              ) : (
                <div className={styles.recentList}>
                  {data.recentDocuments.map((doc) => (
                    <div key={doc.id} className={styles.recentItem} onClick={() => navigate('/documents')}>
                      <span className={styles.recentItemIcon}>{fileIcon(doc.fileType)}</span>
                      <div className={styles.recentItemBody}>
                        <p className={styles.recentItemName}>{doc.fileName}</p>
                        <p className={styles.recentItemMeta}>{timeAgo(doc.createdAt)}</p>
                      </div>
                      <span className={styles.statusBadge} data-status={doc.status}>{doc.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.recentCard}>
              <h3 className={styles.recentTitle}>Recent Conversations</h3>
              {data.recentConversations.length === 0 ? (
                <EmptyState icon="💬" message="No conversations yet" />
              ) : (
                <div className={styles.recentList}>
                  {data.recentConversations.map((conv) => (
                    <div key={conv.id} className={styles.recentItem} onClick={() => navigate('/chat')}>
                      <span className={styles.recentItemIcon}>💬</span>
                      <div className={styles.recentItemBody}>
                        <p className={styles.recentItemName}>{conv.title}</p>
                        <p className={styles.recentItemMeta}>{timeAgo(conv.updatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Disclaimer ── */}
          <div className={styles.disclaimer}>
            <strong>Medical Disclaimer:</strong> MedDoc AI provides informational assistance only and does not replace professional medical advice, diagnosis, or treatment.
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
