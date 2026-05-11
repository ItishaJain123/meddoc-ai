import { useEffect, useState, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import OnboardingModal, { useOnboarding } from '../components/Onboarding/OnboardingModal';
import { generateHealthReportPDF } from '../utils/generatePDF';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea,
  BarChart, Bar, LabelList,
  ResponsiveContainer,
} from 'recharts';
import { fetchDashboard } from '../services/dashboardService';
import styles from './Dashboard.module.css';

// ── Live neon palette (switches when theme changes) ───────────────────────────
const NEON_DARK = {
  green:  '#00ff88',
  blue:   '#00d4ff',
  pink:   '#ff2d78',
  amber:  '#ffe600',
  purple: '#c084fc',
  orange: '#ff7043',
  cyan:   '#00ffff',
  lime:   '#b2ff00',
};
const NEON_LIGHT = {
  green:  '#22c55e',
  blue:   '#6366f1',
  pink:   '#f43f5e',
  amber:  '#f59e0b',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan:   '#06b6d4',
  lime:   '#84cc16',
};

function useNeon() {
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  const [neon, setNeon] = useState(() => isDark() ? NEON_DARK : NEON_LIGHT);

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setNeon(isDark() ? NEON_DARK : NEON_LIGHT)
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return neon;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreLabel(s) {
  if (s == null) return '—';
  if (s >= 75)   return 'Good';
  if (s >= 50)   return 'Moderate';
  return 'Needs Attention';
}
function severityColor(sev) {
  const map = { Normal: '#10b981', Mild: '#f59e0b', Moderate: '#f97316', Severe: '#ec4899', Critical: '#ef4444' };
  return map[sev] ?? '#94a3b8';
}
function severityBg(sev) {
  const map = { Normal: '#d1fae5', Mild: '#fef3c7', Moderate: '#ffedd5', Severe: '#fce7f3', Critical: '#fee2e2' };
  return map[sev] ?? '#f8fafc';
}
function fileIcon(t) {
  if (t === 'application/pdf') return '📄';
  if (t?.startsWith('image/')) return '🖼️';
  return '📁';
}
function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Chart info descriptions ───────────────────────────────────────────────────
const CHART_INFO = {
  breakdown: {
    summary: 'A breakdown of all blood test values across every uploaded report.',
    bullets: [
      'Green = values within the normal/safe reference range',
      'Orange = values slightly outside the reference range',
      'Red = values critically outside range — worth discussing with your doctor',
    ],
  },
  bodyMap: {
    summary: 'Each bar is one blood test metric scored 0–100 based on how close it is to the normal range.',
    bullets: [
      'Longer bar = better score for that metric',
      'Green = good and healthy · Indigo = moderate, worth monitoring · Red = outside safe range',
      'Helps you see at a glance which areas of your health need attention',
    ],
  },
  trend: {
    summary: 'Tracks how a specific blood value has changed over time across your uploaded reports.',
    bullets: [
      'The shaded green band is your doctor\'s safe reference range for that metric',
      'Green dot = value was within safe range · Red dot = value was outside safe range',
      'Use the dropdown to switch between different metrics',
    ],
  },
  flagged: {
    summary: 'Shows which blood test values have been most frequently outside the safe range.',
    bullets: [
      'Longer bar = flagged more times across multiple reports',
      'Use this to spot recurring issues to discuss with your doctor',
      'If a bar disappears after a new upload, that metric has improved',
    ],
  },
  habit: {
    summary: 'Shows how many medical reports you have uploaded each month.',
    bullets: [
      'Taller bar = more reports uploaded that month',
      'Regular uploads help track your health trends more accurately',
      'Aim to upload a report after every doctor visit or lab test',
    ],
  },
};

function ChartInfo({ id }) {
  const [open, setOpen] = useState(false);
  const info = CHART_INFO[id];
  if (!info) return null;
  return (
    <div className={styles.chartInfo}>
      <button
        className={styles.chartInfoToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>What does this mean?</span>
        <span className={`${styles.chartInfoArrow} ${open ? styles.chartInfoArrowOpen : ''}`}>▾</span>
      </button>
      <div className={`${styles.chartInfoBody} ${open ? styles.chartInfoBodyOpen : ''}`}>
        <div>
          <p className={styles.chartInfoSummary}>{info.summary}</p>
          <ul className={styles.chartInfoList}>
            {info.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
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
function StatCard({ label, value, sub, cssVar, icon }) {
  return (
    <div className={styles.statCard} style={{ '--card-neon': `var(${cssVar})` }}>
      <div className={styles.statIconWrap}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statBody}>
        <span className={styles.statValue}>{value ?? '—'}</span>
        <span className={styles.statLabel}>{label}</span>
        {sub && <span className={styles.statSub}>{sub}</span>}
      </div>
    </div>
  );
}

// ── Chart 2: Donut ────────────────────────────────────────────────────────────
const DONUT_LABELS = { Normal: 'Safe range', Abnormal: 'Slightly off', Critical: 'Needs attention' };

function BreakdownDonut({ data }) {
  const neon = useNeon();
  const palette = { Normal: neon.green, Abnormal: neon.orange, Critical: neon.pink };
  const colored = data.map((d) => ({ ...d, color: palette[d.name] ?? '#94a3b8' }));
  const total   = colored.reduce((s, d) => s + d.value, 0);

  return (
    <div className={styles.chartCard} style={{ '--card-neon': neon.green }}>
      <div className={styles.chartHead}>
        <div className={styles.chartIconWrap}><span>🔬</span></div>
        <div>
          <h3 className={styles.chartTitle}>Results Breakdown</h3>
          <p className={styles.chartSub}>How many values are in safe range</p>
        </div>
      </div>
      {colored.length === 0 ? (
        <EmptyState icon="🔬" message="Upload a blood test report to see breakdown" />
      ) : (
        <>
          <div className={`${styles.glowWrap} ${styles.glowDynamic}`} style={{ '--glow-color': neon.green + '33' }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <defs>
                  {colored.map((d, i) => (
                    <radialGradient key={i} id={`donutGrad${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={d.color} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={d.color} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie data={colored} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                  dataKey="value" stroke="none" paddingAngle={3}>
                  {colored.map((e, i) => <Cell key={i} fill={`url(#donutGrad${i})`} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} values (${Math.round(v/total*100)}%)`, DONUT_LABELS[n] ?? n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.donutLegend}>
            {colored.map((d) => (
              <div key={d.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: d.color }} />
                <span className={styles.legendLabel}>{DONUT_LABELS[d.name] ?? d.name}</span>
                <span className={styles.legendVal} style={{ color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <ChartInfo id="breakdown" />
    </div>
  );
}

// ── Chart 3: Body Health Map — horizontal score bars ─────────────────────────
function MetricHealthBars({ data }) {
  const neon = useNeon();
  const barColor = (score) =>
    score >= 75 ? neon.green : score >= 50 ? neon.blue : neon.pink;

  const colored = data.map((d) => ({ ...d, fill: barColor(d.score) }));

  return (
    <div className={styles.chartCard} style={{ '--card-neon': neon.purple }}>
      <div className={styles.chartHead}>
        <div className={styles.chartIconWrap}><span>🩺</span></div>
        <div>
          <h3 className={styles.chartTitle}>Body Health Map</h3>
          <p className={styles.chartSub}>Score per metric — green is good, red needs care</p>
        </div>
      </div>
      {data.length < 2 ? (
        <EmptyState icon="🩺" message="Upload blood test reports to see your metric scores" />
      ) : (
        <div className={styles.glowWrap}>
          <ResponsiveContainer width="100%" height={Math.max(180, colored.length * 34)}>
            <BarChart data={colored} layout="vertical"
              margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <defs>
                {colored.map((d, i) => (
                  <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.fill} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={d.fill} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="metric" width={96}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip formatter={(v) => [`${v} / 100`, 'Score']} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive>
                {colored.map((d, i) => <Cell key={i} fill={`url(#barGrad${i})`} />)}
                <LabelList dataKey="score" position="right"
                  formatter={(v) => `${v}`}
                  style={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <ChartInfo id="bodyMap" />
    </div>
  );
}

// ── Chart 4: Trend line ───────────────────────────────────────────────────────
function TrendTooltip({ active, payload, label }) {
  const neon = useNeon();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.ttDate}>{label}</p>
      <p className={styles.ttValue}>{d.value} {d.unit}</p>
      <p className={styles.ttStatus} style={{ color: d.isAbnormal ? neon.pink : neon.green }}>
        {d.isAbnormal ? '⚠ Outside safe range' : '✓ Within safe range'}
      </p>
    </div>
  );
}

function MetricTrend({ trends, metricNames }) {
  const neon = useNeon();
  const [selected, setSelected] = useState(metricNames[0] ?? null);
  const metric = selected ? trends[selected] : null;

  return (
    <div className={styles.chartCard} style={{ '--card-neon': neon.purple }}>
      <div className={styles.trendHeader}>
        <div className={styles.chartHead}>
          <div className={styles.chartIconWrap}><span>📈</span></div>
          <div>
            <h3 className={styles.chartTitle}>Metric Trend</h3>
            <p className={styles.chartSub}>Shaded band = safe range · Green dot = normal · Red dot = outside range</p>
          </div>
        </div>
        {metricNames.length > 0 && (
          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>Metric:</label>
            <select className={styles.metricSelect} value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
              {metricNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>
      {!metric ? (
        <EmptyState icon="📈" message="Upload a blood test report to track values over time" />
      ) : (
        <div className={`${styles.glowWrap} ${styles.glowDynamic}`} style={{ '--glow-color': neon.purple + '33' }}>
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={metric.points} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="refAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neon.green} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={neon.green} stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={neon.purple} />
                  <stop offset="100%" stopColor={neon.blue} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={45} />
              <Tooltip content={<TrendTooltip />} />
              {metric.refLow != null && metric.refHigh != null && (
                <ReferenceArea y1={metric.refLow} y2={metric.refHigh}
                  fill="url(#refAreaGrad)"
                  stroke={neon.green} strokeOpacity={0.5} strokeDasharray="5 4" />
              )}
              <Line
                dataKey="value"
                stroke="url(#lineGrad)"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  const c = payload.isAbnormal ? neon.pink : neon.green;
                  return (
                    <circle key={index} cx={cx} cy={cy} r={5.5}
                      fill={c} stroke="var(--surface)" strokeWidth={2.5}
                      style={{ filter: `drop-shadow(0 0 5px ${c}aa)` }} />
                  );
                }}
                activeDot={{ r: 8, stroke: neon.purple, strokeWidth: 2, fill: 'var(--surface)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ChartInfo id="trend" />
    </div>
  );
}

// ── Chart 5: Top flagged ──────────────────────────────────────────────────────
function TopFlagged({ data }) {
  const neon = useNeon();
  const COLS = [neon.pink, neon.orange, neon.amber, neon.purple, neon.cyan];

  return (
    <div className={styles.chartCard} style={{ '--card-neon': neon.pink }}>
      <div className={styles.chartHead}>
        <div className={styles.chartIconWrap}><span>⚠️</span></div>
        <div>
          <h3 className={styles.chartTitle}>Most Flagged Values</h3>
          <p className={styles.chartSub}>Longer bar = more reports outside safe range</p>
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState icon="✅" message="All values within safe range — great job!" />
      ) : (
        <div className={`${styles.glowWrap} ${styles.glowDynamic}`} style={{ '--glow-color': neon.pink + '33' }}>
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip formatter={(v) => [`${v} time${v !== 1 ? 's' : ''}`, 'Outside safe range']} />
              <Bar dataKey="abnormal" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {data.map((_, i) => <Cell key={i} fill={COLS[i % COLS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <ChartInfo id="flagged" />
    </div>
  );
}

// ── Chart 6: Upload activity ──────────────────────────────────────────────────
function UploadActivity({ data }) {
  const neon = useNeon();
  return (
    <div className={styles.chartCard} style={{ '--card-neon': neon.cyan }}>
      <div className={styles.chartHead}>
        <div className={styles.chartIconWrap}><span>📊</span></div>
        <div>
          <h3 className={styles.chartTitle}>Monitoring Habit</h3>
          <p className={styles.chartSub}>Reports uploaded per month</p>
        </div>
      </div>
      <div className={`${styles.glowWrap} ${styles.glowDynamic}`} style={{ '--glow-color': neon.cyan + '33' }}>
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={neon.cyan} />
                <stop offset="100%" stopColor={neon.purple} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip formatter={(v) => [`${v} report${v !== 1 ? 's' : ''}`, 'Uploaded']} />
            <Bar dataKey="count" fill="url(#uploadGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartInfo id="habit" />
    </div>
  );
}

// ── Abnormal values list ──────────────────────────────────────────────────────
function AbnormalValuesList({ values }) {
  const neon = useNeon();
  if (values.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Current Abnormal Values</h2>
      <p className={styles.sectionSub}>Latest reading per metric that is outside the safe reference range</p>
      <div className={styles.abnormalGrid}>
        {values.map((v) => {
          const color = v.isCritical ? neon.pink : neon.orange;
          const hasRange = v.refRangeLow != null && v.refRangeHigh != null;
          return (
            <div key={v.metricName} className={styles.abnormalCard}
              style={{ '--ab-color': color }}>
              <div className={styles.abnormalTop}>
                <span className={styles.abnormalName}>{v.metricName}</span>
                <span className={styles.abnormalBadge} style={{ background: color + '18', color, border: `1px solid ${color}44` }}>
                  {v.isCritical ? 'Critical' : 'Abnormal'}
                </span>
              </div>
              <div className={styles.abnormalValues}>
                <div className={styles.abnormalActual}>
                  <span className={styles.abnormalVal} style={{ color }}>{v.value}</span>
                  <span className={styles.abnormalUnit}>{v.unit}</span>
                </div>
                {hasRange && (
                  <div className={styles.abnormalRange}>
                    <span className={styles.abnormalRangeLabel}>Normal</span>
                    <span className={styles.abnormalRangeVal}>{v.refRangeLow} – {v.refRangeHigh} {v.unit}</span>
                  </div>
                )}
              </div>
              <p className={styles.abnormalDate}>
                Last checked: {new Date(v.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Health Goals progress ─────────────────────────────────────────────────────
function HealthGoalsProgress({ goals, onNavigate }) {
  const neon = useNeon();
  if (goals.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Health Goals</h2>
          <p className={styles.sectionSub}>Progress toward your targets based on latest reports</p>
        </div>
        <button className={styles.recentLink} onClick={onNavigate}>Manage goals →</button>
      </div>
      <div className={styles.goalsGrid}>
        {goals.map((g) => {
          const color = g.achieved ? neon.green : g.currentValue == null ? '#94a3b8' : g.progress >= 70 ? neon.blue : neon.orange;
          return (
            <div key={g.id} className={styles.goalCard} style={{ '--goal-color': color }}>
              <div className={styles.goalTop}>
                <span className={styles.goalName}>{g.metricName}</span>
                {g.achieved != null && (
                  <span className={styles.goalBadge} style={{ background: color + '18', color, border: `1px solid ${color}44` }}>
                    {g.achieved ? '✓ Achieved' : 'In progress'}
                  </span>
                )}
              </div>
              <div className={styles.goalTarget}>
                Target: {g.direction === 'above' ? '≥' : '≤'} {g.targetValue} {g.unit}
                {g.currentValue != null && (
                  <span className={styles.goalCurrent}> · Current: <strong style={{ color }}>{g.currentValue} {g.unit}</strong></span>
                )}
              </div>
              {g.currentValue != null ? (
                <div className={styles.goalBarWrap}>
                  <div className={styles.goalBar}>
                    <div className={styles.goalBarFill}
                      style={{ width: `${g.progress}%`, background: color }} />
                  </div>
                  <span className={styles.goalPct} style={{ color }}>{g.progress}%</span>
                </div>
              ) : (
                <p className={styles.goalHint}>Upload a report with {g.metricName} to track progress</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PDF Summary card ──────────────────────────────────────────────────────────
function PdfSummaryCard({ data, userName, onExport, exporting }) {
  const neon = useNeon();
  const totalAbnormal = (data.stats.abnormalCount ?? 0);
  const goalsAchieved = data.goals?.filter((g) => g.achieved).length ?? 0;

  return (
    <div className={styles.pdfCard}>
      <div className={styles.pdfLeft}>
        <div className={styles.pdfIcon}>📋</div>
        <div>
          <h3 className={styles.pdfTitle}>Health Summary Report</h3>
          <p className={styles.pdfSub}>Download a complete PDF of your health data — metrics, findings, goals &amp; trends</p>
          <div className={styles.pdfStats}>
            <span className={styles.pdfStat}><strong>{data.stats.totalMetrics}</strong> metrics tracked</span>
            <span className={styles.pdfDot} />
            <span className={styles.pdfStat}><strong style={{ color: totalAbnormal > 0 ? neon.orange : neon.green }}>{totalAbnormal}</strong> abnormal values</span>
            <span className={styles.pdfDot} />
            <span className={styles.pdfStat}><strong style={{ color: neon.green }}>{goalsAchieved}</strong> goals achieved</span>
          </div>
        </div>
      </div>
      <button className={styles.pdfBtn} onClick={onExport} disabled={exporting}
        style={{ '--pdf-color': neon.purple }}>
        {exporting ? 'Generating…' : '⬇ Download PDF'}
      </button>
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────
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
  const { user }     = useUser();
  const { getToken } = useAuth();
  const navigate     = useNavigate();
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();

  function handleExportPDF() {
    if (!data) return;
    setExporting(true);
    setTimeout(() => {
      generateHealthReportPDF(data, user?.fullName || user?.firstName);
      setExporting(false);
    }, 50);
  }

  useEffect(() => {
    fetchDashboard(getToken)
      .then(setData)
      .catch((err) => { console.error(err); setError(err.message); })
      .finally(() => setLoading(false));
  }, [getToken]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className={styles.page}>
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.name}>{user?.firstName || 'there'} <span className={styles.wave}>👋</span></h1>
          <p className={styles.headerTagline}>Your personal health overview</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => navigate('/documents')}>
            <span>📤</span> Upload Report
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/chat')}>
            <span>✨</span> Ask the AI
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : !data ? (
        <div className={styles.errorState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p className={styles.emptyMsg}>Could not load dashboard. Please try refreshing.</p>
          {error && <code className={styles.errorDetail}>{error}</code>}
          <p className={styles.errorHint}>Make sure the server is running on port 5000.</p>
        </div>
      ) : (
        <>
          {/* ── Stats row ── */}
          <div className={styles.statsRow}>
            <StatCard label="Documents"   value={data.stats.totalDocuments}    cssVar="--neon-blue"   icon="📄" />
            <StatCard label="Lab Metrics" value={data.stats.totalMetrics}      cssVar="--neon-cyan"   icon="🔬" />
            <StatCard label="Abnormal"    value={data.stats.abnormalCount}     cssVar="--neon-amber"  icon="⚠️"
              sub={data.stats.criticalCount > 0 ? `${data.stats.criticalCount} critical` : null} />
            <StatCard label="AI Chats"    value={data.stats.conversationCount} cssVar="--neon-purple" icon="💬" />
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

          {/* ── Charts row 1 ── */}
          <div className={styles.row2}>
            <BreakdownDonut data={data.metricsBreakdown} />
            <MetricHealthBars data={data.radarData} />
          </div>

          {/* ── Trend line ── */}
          <MetricTrend trends={data.trends} metricNames={data.metricNames} />

          {/* ── Charts row 2 ── */}
          <div className={styles.row2}>
            <TopFlagged data={data.topFlagged} />
            <UploadActivity data={data.uploadActivity} />
          </div>

          {/* ── Findings ── */}
          {data.findings.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Imaging &amp; Clinical Findings</h2>
              <p className={styles.sectionSub}>From X-rays, sonography, prescriptions &amp; other reports</p>
              <div className={styles.findingsGrid}>
                {data.findings.map((f) => <FindingCard key={f.id} finding={f} />)}
              </div>
            </div>
          )}

          {/* ── Abnormal values ── */}
          <AbnormalValuesList values={data.abnormalValues ?? []} />

          {/* ── Health Goals ── */}
          <HealthGoalsProgress goals={data.goals ?? []} onNavigate={() => navigate('/goals')} />

          {/* ── Recent activity ── */}
          <div className={styles.row2}>
            <div className={styles.recentCard}>
              <div className={styles.recentHeader}>
                <h3 className={styles.recentTitle}>Recent Documents</h3>
                <button className={styles.recentLink} onClick={() => navigate('/documents')}>View all →</button>
              </div>
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
              <div className={styles.recentHeader}>
                <h3 className={styles.recentTitle}>Recent Conversations</h3>
                <button className={styles.recentLink} onClick={() => navigate('/chat')}>View all →</button>
              </div>
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

          {/* ── PDF Summary card ── */}
          <PdfSummaryCard data={data} userName={user?.firstName} onExport={handleExportPDF} exporting={exporting} />

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
