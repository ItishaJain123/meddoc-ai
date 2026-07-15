const prisma = require('../config/db');

/**
 * GET /api/dashboard/timeline
 * One chronological feed of health events across all documents:
 * report uploads, abnormal/critical values, clinical findings, medications.
 */
async function getTimeline(req, res) {
  const userId = req.user.id;

  const [documents, abnormalMetrics, findings] = await Promise.all([
    prisma.document.findMany({
      where: { userId, status: 'READY' },
      select: { id: true, fileName: true, fileType: true, createdAt: true },
    }),
    prisma.healthMetric.findMany({
      where: { userId, OR: [{ isAbnormal: true }, { isCritical: true }] },
      select: {
        id: true, metricName: true, value: true, unit: true,
        refRangeLow: true, refRangeHigh: true, isCritical: true, reportDate: true,
        document: { select: { fileName: true } },
      },
    }),
    prisma.documentFinding.findMany({
      where: { userId },
      select: {
        id: true, documentType: true, finding: true, severity: true,
        isAbnormal: true, reportDate: true,
        document: { select: { fileName: true } },
      },
    }),
  ]);

  const events = [];

  for (const d of documents) {
    events.push({
      id: `doc-${d.id}`,
      type: 'document',
      date: d.createdAt,
      title: d.fileType === 'manual' ? 'Manual vitals started' : 'Report uploaded',
      detail: d.fileName,
    });
  }

  for (const m of abnormalMetrics) {
    const range = m.refRangeLow != null && m.refRangeHigh != null
      ? ` (normal ${m.refRangeLow}–${m.refRangeHigh})`
      : '';
    events.push({
      id: `metric-${m.id}`,
      type: m.isCritical ? 'critical' : 'abnormal',
      date: m.reportDate,
      title: `${m.metricName} ${m.isCritical ? 'critical' : 'out of range'}`,
      detail: `${m.value} ${m.unit || ''}${range}`,
      source: m.document?.fileName,
    });
  }

  for (const f of findings) {
    events.push({
      id: `finding-${f.id}`,
      type: f.documentType === 'Prescription' ? 'medication' : 'finding',
      date: f.reportDate,
      title: f.documentType === 'Prescription' ? 'Medication prescribed' : `${f.documentType}${f.severity !== 'Normal' ? ` — ${f.severity}` : ''}`,
      detail: f.finding,
      source: f.document?.fileName,
    });
  }

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(events);
}

module.exports = { getTimeline };
