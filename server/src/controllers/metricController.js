const prisma = require('../config/db');

// GET /api/metrics — all metrics grouped by name for trend charts
async function getMetrics(req, res) {
  const metrics = await prisma.healthMetric.findMany({
    where: { userId: req.user.id },
    orderBy: [{ metricName: 'asc' }, { reportDate: 'asc' }],
    select: {
      id: true,
      metricName: true,
      value: true,
      unit: true,
      refRangeLow: true,
      refRangeHigh: true,
      isAbnormal: true,
      isCritical: true,
      reportDate: true,
      documentId: true,
      document: { select: { fileName: true } },
    },
  });

  // Group by metricName for easy chart rendering
  const grouped = {};
  for (const m of metrics) {
    if (!grouped[m.metricName]) grouped[m.metricName] = [];
    grouped[m.metricName].push({
      id: m.id,
      value: m.value,
      unit: m.unit,
      refRangeLow: m.refRangeLow,
      refRangeHigh: m.refRangeHigh,
      isAbnormal: m.isAbnormal,
      isCritical: m.isCritical,
      reportDate: m.reportDate,
      documentName: m.document?.fileName,
    });
  }

  res.json(grouped);
}

// GET /api/metrics/critical — only critical alerts
async function getCriticalAlerts(req, res) {
  const alerts = await prisma.healthMetric.findMany({
    where: { userId: req.user.id, isCritical: true },
    orderBy: { reportDate: 'desc' },
    select: {
      id: true,
      metricName: true,
      value: true,
      unit: true,
      refRangeLow: true,
      refRangeHigh: true,
      reportDate: true,
      document: { select: { fileName: true } },
    },
  });

  res.json(alerts);
}

module.exports = { getMetrics, getCriticalAlerts };
