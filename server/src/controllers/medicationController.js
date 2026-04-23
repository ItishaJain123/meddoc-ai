const prisma = require('../config/db');

async function getMedications(req, res) {
  const userId = req.user.id;

  const findings = await prisma.documentFinding.findMany({
    where: { userId, documentType: 'Prescription' },
    orderBy: { reportDate: 'desc' },
    select: {
      id: true,
      finding: true,
      severity: true,
      reportDate: true,
      document: { select: { fileName: true, createdAt: true } },
    },
  });

  res.json(findings.map(({ document, ...f }) => ({
    ...f,
    documentName: document?.fileName ?? null,
    documentDate: document?.createdAt ?? null,
  })));
}

module.exports = { getMedications };
