const prisma = require('../config/db');
const { createShareToken, verifyShareToken } = require('../utils/shareToken');

// POST /api/share — create an expiring read-only link (auth required)
async function createShareLink(req, res) {
  const { token, expiresAt } = createShareToken(req.user.id);
  const clientUrl = process.env.MEDDOC_CLIENT_URL || 'http://localhost:5173';

  res.json({
    url: `${clientUrl}/share/${token}`,
    expiresAt,
  });
}

// GET /api/share/:token — public, read-only health snapshot (no auth).
// Returns only what a doctor needs; no account details, no chat history.
async function getSharedSummary(req, res) {
  const verified = verifyShareToken(req.params.token);
  if (!verified) {
    return res.status(410).json({ error: 'This link is invalid or has expired.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, fullName: true },
  });
  if (!user) return res.status(410).json({ error: 'This link is invalid or has expired.' });

  // This endpoint is public (the token is the only credential), so every query
  // is bounded — a shared link can never trigger an unbounded scan/serialization.
  const [metrics, findings, documents] = await Promise.all([
    prisma.healthMetric.findMany({
      where: { userId: user.id },
      orderBy: { reportDate: 'desc' },
      take: 500,
      select: {
        metricName: true, value: true, unit: true,
        refRangeLow: true, refRangeHigh: true,
        isAbnormal: true, isCritical: true, reportDate: true,
        document: { select: { fileName: true } },
      },
    }),
    prisma.documentFinding.findMany({
      where: { userId: user.id },
      orderBy: { reportDate: 'desc' },
      take: 200,
      select: {
        documentType: true, bodyPart: true, finding: true,
        severity: true, reportDate: true,
      },
    }),
    prisma.document.findMany({
      where: { userId: user.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { fileName: true, createdAt: true },
    }),
  ]);

  // Group metrics by name; sort ascending so the latest reading is last
  // (we queried newest-first for the take cap, so re-sort before grouping).
  metrics.sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));
  const grouped = {};
  for (const m of metrics) {
    if (!grouped[m.metricName]) grouped[m.metricName] = [];
    grouped[m.metricName].push({
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

  res.json({
    patientName: user.fullName || 'Patient',
    generatedAt: new Date().toISOString(),
    expiresAt: verified.expiresAt,
    documents,
    metrics: grouped,
    findings,
  });
}

module.exports = { createShareLink, getSharedSummary };
