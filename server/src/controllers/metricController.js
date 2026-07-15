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
      documentId: m.documentId,
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

// POST /api/metrics/manual — add a manually-recorded vital (BP, weight, sugar…)
async function addManualMetric(req, res) {
  const { metricName, value, unit, refRangeLow, refRangeHigh, reportDate } = req.body;

  const numValue = Number(value);
  if (!metricName?.trim() || !Number.isFinite(numValue)) {
    return res.status(400).json({ error: 'metricName and a numeric value are required' });
  }

  const low  = refRangeLow  != null && refRangeLow  !== '' ? Number(refRangeLow)  : null;
  const high = refRangeHigh != null && refRangeHigh !== '' ? Number(refRangeHigh) : null;
  const date = reportDate ? new Date(reportDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  // All manual vitals hang off one synthetic "Manual Entries" document
  let doc = await prisma.document.findFirst({
    where: { userId: req.user.id, fileType: 'manual' },
  });
  if (!doc) {
    doc = await prisma.document.create({
      data: {
        userId: req.user.id,
        fileName: 'Manual Entries',
        fileType: 'manual',
        filePath: '',
        fileSize: 0,
        status: 'READY',
        extractedText: 'Manually recorded vitals.',
      },
    });
  }

  const metric = await prisma.healthMetric.create({
    data: {
      userId: req.user.id,
      documentId: doc.id,
      metricName: metricName.trim(),
      value: numValue,
      unit: unit?.trim() || null,
      refRangeLow: Number.isFinite(low) ? low : null,
      refRangeHigh: Number.isFinite(high) ? high : null,
      isAbnormal: low != null && high != null ? numValue < low || numValue > high : false,
      isCritical: false,
      reportDate: date,
    },
  });

  res.status(201).json(metric);
}

// POST /api/metrics/compare-narrative — AI "what changed" paragraph for two reports
async function compareNarrative(req, res) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const { retryWithBackoff } = require('../utils/retryWithBackoff');
  const { docAId, docBId } = req.body;

  if (!docAId || !docBId) {
    return res.status(400).json({ error: 'docAId and docBId are required' });
  }

  const [docA, docB] = await Promise.all([
    prisma.document.findFirst({ where: { id: docAId, userId: req.user.id }, select: { id: true, fileName: true } }),
    prisma.document.findFirst({ where: { id: docBId, userId: req.user.id }, select: { id: true, fileName: true } }),
  ]);
  if (!docA || !docB) return res.status(404).json({ error: 'Report not found' });

  const metrics = await prisma.healthMetric.findMany({
    where: { userId: req.user.id, documentId: { in: [docAId, docBId] } },
    select: { documentId: true, metricName: true, value: true, unit: true, refRangeLow: true, refRangeHigh: true, isAbnormal: true },
  });

  const lines = [];
  const names = [...new Set(metrics.map((m) => m.metricName))].sort();
  for (const name of names) {
    const a = metrics.find((m) => m.metricName === name && m.documentId === docAId);
    const b = metrics.find((m) => m.metricName === name && m.documentId === docBId);
    const fmt = (m) => (m ? `${m.value} ${m.unit || ''}${m.isAbnormal ? ' (abnormal)' : ''}` : 'not measured');
    lines.push(`${name}: earlier ${fmt(a)} → later ${fmt(b)}`);
  }
  if (lines.length === 0) {
    return res.status(400).json({ error: 'No shared metrics between these reports' });
  }

  const genAI = new GoogleGenerativeAI(process.env.MEDDOC_GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: process.env.MEDDOC_GEMINI_MODEL });

  const prompt = `You are a friendly medical assistant. A patient compared two of their lab reports.
Earlier report: "${docA.fileName}". Later report: "${docB.fileName}".

Metric changes (earlier → later):
${lines.join('\n')}

Write a short plain-language summary (110 words max) of what changed between the two reports:
which values improved, which worsened or stayed abnormal, and one encouraging,
practical closing sentence. Do not give a diagnosis. Do not use markdown headers or bullet lists —
write 1-2 flowing paragraphs. End by reminding them to discuss results with their doctor.`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  res.json({ narrative: result.response.text().trim() });
}

module.exports = { getMetrics, getCriticalAlerts, addManualMetric, compareNarrative };
