const fs = require('fs');
const prisma = require('../config/db');
const { processDocument, deleteDocument } = require('../services/documentService');

// POST /api/documents/upload
async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, mimetype, size, path: filePath } = req.file;
  const userId = req.user.id;

  // Check document limit (max 10)
  const count = await prisma.document.count({ where: { userId } });
  if (count >= 10) {
    fs.unlink(filePath, () => {});
    return res.status(400).json({ error: 'Maximum 10 documents allowed per user. Please delete an existing document first.' });
  }

  // Check for duplicate (same name + same size = same file)
  const duplicate = await prisma.document.findFirst({
    where: { userId, fileName: originalname, fileSize: size },
  });
  if (duplicate) {
    fs.unlink(filePath, () => {});
    return res.status(409).json({ error: `"${originalname}" has already been uploaded. Delete the existing copy first if you want to re-upload it.` });
  }

  // Save document record to DB with PROCESSING status
  const doc = await prisma.document.create({
    data: {
      userId,
      fileName: originalname,
      fileType: mimetype,
      filePath,
      fileSize: size,
      status: 'PROCESSING',
    },
  });

  // Process asynchronously (don't await — return immediately)
  processDocument(doc.id, userId).catch(console.error);

  res.status(201).json(doc);
}

// GET /api/documents
async function listDocuments(req, res) {
  const documents = await prisma.document.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      status: true,
      pageCount: true,
      extractedText: true,
      createdAt: true,
    },
  });

  res.json(documents.map(({ extractedText, ...doc }) => ({
    ...doc,
    rejectionReason: extractedText?.startsWith('NOT_MEDICAL:')
      ? extractedText.replace('NOT_MEDICAL:', '').trim()
      : null,
  })));
}

// GET /api/documents/:id/status
async function getDocumentStatus(req, res) {
  const doc = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true, status: true, extractedText: true },
  });

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { extractedText, ...rest } = doc;
  res.json({
    ...rest,
    rejectionReason: extractedText?.startsWith('NOT_MEDICAL:')
      ? extractedText.replace('NOT_MEDICAL:', '').trim()
      : null,
  });
}

// DELETE /api/documents/:id
async function removeDocument(req, res) {
  try {
    await deleteDocument(req.params.id, req.user.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    if (err.message === 'Document not found') {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
}

// POST /api/documents/:id/reextract
async function reextractDocument(req, res) {
  const { extractDocumentFindings } = require('../agents/findingExtractor');

  const doc = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.status !== 'READY') return res.status(400).json({ error: 'Document must be in READY status' });
  if (!doc.extractedText) return res.status(400).json({ error: 'No extracted text available' });

  // Delete old findings for this document
  await prisma.documentFinding.deleteMany({ where: { documentId: doc.id } });

  const findings = await extractDocumentFindings(doc.extractedText, doc.id, doc.userId);
  if (findings.length > 0) {
    await prisma.documentFinding.createMany({ data: findings });
  }

  res.json({ message: `Re-extracted ${findings.length} findings`, findings });
}

module.exports = { uploadDocument, listDocuments, getDocumentStatus, removeDocument, reextractDocument };
