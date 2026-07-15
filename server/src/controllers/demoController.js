const prisma = require('../config/db');
const { DEMO_DOCS, metricsFor } = require('../services/demoData');
const { splitIntoChunks } = require('../agents/documentProcessor');
const { addDocumentToVectorStore } = require('../agents/embeddingService');

// POST /api/demo/seed — instantly load sample reports for the current user
async function seedDemoData(req, res) {
  const userId = req.user.id;

  const existing = await prisma.document.findFirst({
    where: { userId, fileName: { startsWith: 'Sample — ' } },
    select: { id: true },
  });
  if (existing) {
    return res.json({ alreadySeeded: true, message: 'Sample data is already loaded.' });
  }

  const count = await prisma.document.count({ where: { userId } });
  if (count + DEMO_DOCS.length > 10) {
    return res.status(400).json({ error: 'Not enough free document slots (3 needed). Delete some documents first.' });
  }

  // Create the 3 sample documents in parallel — each is independent. Keep the
  // demo definition paired with its created row so we never re-join on fileName.
  const pairs = await Promise.all(
    DEMO_DOCS.map(async (demo) => {
      const doc = await prisma.document.create({
        data: {
          userId,
          fileName: demo.fileName,
          fileType: 'application/pdf',
          filePath: '',
          fileSize: demo.text.length,
          status: 'READY',
          pageCount: 1,
          extractedText: demo.text,
          vectorStoreId: userId,
        },
      });
      return { doc, demo };
    })
  );

  // Batch all metrics and findings into one insert each.
  const allMetrics = pairs.flatMap(({ doc, demo }) =>
    metricsFor(doc.id, userId, demo.reportDate, demo.values)
  );
  const allFindings = pairs.flatMap(({ doc, demo }) =>
    demo.findings.map((f) => ({ ...f, userId, documentId: doc.id, reportDate: demo.reportDate }))
  );
  await Promise.all([
    allMetrics.length ? prisma.healthMetric.createMany({ data: allMetrics }) : null,
    allFindings.length ? prisma.documentFinding.createMany({ data: allFindings }) : null,
  ]);

  const created = pairs.map((p) => p.doc);

  // Embed for chat (needs the Gemini API — non-fatal if it fails, everything
  // else still works and chat will simply have no context).
  // NOTE: kept sequential on purpose — addDocumentToVectorStore does a
  // read-modify-write on one JSON file per user, so parallel writes would
  // clobber each other.
  let chatReady = true;
  try {
    for (const { doc, demo } of pairs) {
      const chunks = await splitIntoChunks(demo.text, {
        documentId: doc.id,
        userId,
        fileName: doc.fileName,
        fileType: doc.fileType,
      });
      await addDocumentToVectorStore(userId, chunks);
    }
  } catch (err) {
    chatReady = false;
    console.error('Demo embedding failed (non-fatal):', err.message);
  }

  res.status(201).json({
    message: 'Sample data loaded',
    documents: created.length,
    chatReady,
  });
}

// DELETE /api/demo — remove all sample documents and everything derived from them
async function clearDemoData(req, res) {
  const userId = req.user.id;
  const { removeDocumentFromVectorStore } = require('../agents/embeddingService');

  const sampleDocs = await prisma.document.findMany({
    where: { userId, fileName: { startsWith: 'Sample — ' } },
    select: { id: true },
  });

  if (sampleDocs.length === 0) {
    return res.json({ message: 'No sample data to clear.', removed: 0 });
  }

  // Vector-store cleanup is per-document; DB rows (metrics + findings) cascade
  // on document delete. Sample docs have no file on disk (filePath '').
  for (const doc of sampleDocs) {
    await removeDocumentFromVectorStore(userId, doc.id);
  }
  await prisma.document.deleteMany({
    where: { id: { in: sampleDocs.map((d) => d.id) } },
  });

  res.json({ message: 'Sample data cleared', removed: sampleDocs.length });
}

module.exports = { seedDemoData, clearDemoData };
