const prisma = require('../config/db');

function normalizeScore(value, low, high) {
  if (low == null || high == null || isNaN(value)) return null;
  const range = high - low;
  if (range === 0) return value === low ? 100 : 0;
  if (value >= low && value <= high) {
    const mid = (low + high) / 2;
    const distFromMid = Math.abs(value - mid) / (range / 2);
    return Math.round(100 - distFromMid * 20); // 80–100 when inside range
  }
  const deviation = value < low ? (low - value) : (value - high);
  return Math.max(0, Math.round(70 - (deviation / range) * 70)); // 0–70 when outside
}

async function getDashboard(req, res) {
  const userId = req.user.id;

  const [
    totalDocuments,
    totalMetrics,
    abnormalCount,
    criticalCount,
    conversationCount,
    allMetrics,
    recentDocuments,
    recentConversations,
    recentFindings,
    allDocDates,
  ] = await Promise.all([
    prisma.document.count({ where: { userId, status: 'READY' } }),
    prisma.healthMetric.count({ where: { userId } }),
    prisma.healthMetric.count({ where: { userId, isAbnormal: true, isCritical: false } }),
    prisma.healthMetric.count({ where: { userId, isCritical: true } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.healthMetric.findMany({
      where: { userId },
      orderBy: [{ metricName: 'asc' }, { reportDate: 'asc' }],
      select: {
        metricName: true, value: true, unit: true,
        refRangeLow: true, refRangeHigh: true,
        isAbnormal: true, isCritical: true, reportDate: true,
      },
    }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, fileName: true, fileType: true, status: true, createdAt: true },
    }),
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.documentFinding.findMany({
      where: { userId },
      orderBy: { reportDate: 'desc' },
      take: 8,
      select: {
        id: true, documentType: true, bodyPart: true,
        finding: true, severity: true, isAbnormal: true, reportDate: true,
        document: { select: { fileName: true } },
      },
    }),
    prisma.document.findMany({
      where: { userId },
      select: { createdAt: true },
    }),
  ]);

  // ── Health score ──────────────────────────────────────────────────────────
  const totalAbnormal = abnormalCount + criticalCount;
  const healthScore = totalMetrics > 0
    ? Math.round(((totalMetrics - totalAbnormal) / totalMetrics) * 100)
    : null;

  // ── Donut breakdown ───────────────────────────────────────────────────────
  const normalCount = totalMetrics - totalAbnormal;
  const metricsBreakdown = [
    { name: 'Normal',   value: normalCount,   color: '#059669' },
    { name: 'Abnormal', value: abnormalCount,  color: '#d97706' },
    { name: 'Critical', value: criticalCount,  color: '#dc2626' },
  ].filter((d) => d.value > 0);

  // ── Trends (grouped by metric name) ──────────────────────────────────────
  const grouped = {};
  for (const m of allMetrics) {
    if (!grouped[m.metricName]) {
      grouped[m.metricName] = { points: [], refLow: null, refHigh: null, unit: m.unit };
    }
    grouped[m.metricName].points.push({
      date:       new Date(m.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
      value:      m.value,
      isAbnormal: m.isAbnormal || m.isCritical,
    });
    if (m.refRangeLow  != null) grouped[m.metricName].refLow  = m.refRangeLow;
    if (m.refRangeHigh != null) grouped[m.metricName].refHigh = m.refRangeHigh;
  }
  const metricNames = Object.keys(grouped);

  // ── Top flagged ───────────────────────────────────────────────────────────
  const flagMap = {};
  for (const m of allMetrics) {
    if (!flagMap[m.metricName]) flagMap[m.metricName] = { total: 0, abnormal: 0 };
    flagMap[m.metricName].total++;
    if (m.isAbnormal || m.isCritical) flagMap[m.metricName].abnormal++;
  }
  const topFlagged = Object.entries(flagMap)
    .filter(([, v]) => v.abnormal > 0)
    .map(([name, v]) => ({ name, abnormal: v.abnormal, total: v.total }))
    .sort((a, b) => b.abnormal - a.abnormal)
    .slice(0, 8);

  // ── Upload activity (last 6 months) ──────────────────────────────────────
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: 0,
    };
  });
  for (const doc of allDocDates) {
    const d   = new Date(doc.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const slot = months.find((m) => m.key === key);
    if (slot) slot.count++;
  }
  const uploadActivity = months.map(({ month, count }) => ({ month, count }));

  // ── Radar data (latest value per metric, normalised 0-100) ────────────────
  const latestPerMetric = {};
  for (const m of allMetrics) {
    const existing = latestPerMetric[m.metricName];
    if (!existing || new Date(m.reportDate) > new Date(existing.reportDate)) {
      latestPerMetric[m.metricName] = m;
    }
  }
  const radarData = Object.values(latestPerMetric)
    .filter((m) => m.refRangeLow != null && m.refRangeHigh != null)
    .map((m) => ({
      metric: m.metricName.length > 12 ? m.metricName.slice(0, 11) + '…' : m.metricName,
      score:  normalizeScore(m.value, m.refRangeLow, m.refRangeHigh),
    }))
    .filter((r) => r.score != null)
    .slice(0, 7);

  res.json({
    stats: {
      totalDocuments,
      totalMetrics,
      abnormalCount: totalAbnormal,
      criticalCount,
      conversationCount,
    },
    healthScore,
    metricsBreakdown,
    trends:         grouped,
    metricNames,
    topFlagged,
    uploadActivity,
    radarData,
    findings: recentFindings.map(({ document, ...f }) => ({
      ...f,
      reportDate:   f.reportDate,
      documentName: document?.fileName ?? null,
    })),
    recentDocuments,
    recentConversations,
  });
}

module.exports = { getDashboard };
