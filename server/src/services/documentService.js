const fs = require('fs');
const prisma = require('../config/db');
const { extractTextFromPDF, verifyAndExtractImage, splitIntoChunks, verifyMedicalDocument } = require('../agents/documentProcessor');
const { addDocumentToVectorStore, removeDocumentFromVectorStore } = require('../agents/embeddingService');
const { extractHealthMetrics } = require('../agents/metricExtractor');
const { extractDocumentFindings } = require('../agents/findingExtractor');
const { encryptBuffer, decryptBuffer } = require('../utils/encryption');

/**
 * Encrypt a file in-place. Returns the IV hex string.
 */
function encryptFileInPlace(filePath) {
  const raw = fs.readFileSync(filePath);
  const { encryptedBuffer, iv } = encryptBuffer(raw);
  fs.writeFileSync(filePath, encryptedBuffer);
  return iv;
}

/**
 * Read and decrypt a file into a Buffer without writing to disk.
 */
function readDecrypted(filePath, ivHex) {
  const encrypted = fs.readFileSync(filePath);
  return decryptBuffer(encrypted, ivHex);
}

/**
 * Securely delete a file (overwrite with zeros then unlink).
 */
function secureDelete(filePath) {
  if (!fs.existsSync(filePath)) return;
  const size = fs.statSync(filePath).size;
  const fd = fs.openSync(filePath, 'r+');
  fs.writeSync(fd, Buffer.alloc(size), 0, size, 0);
  fs.closeSync(fd);
  fs.unlinkSync(filePath);
}

/**
 * Process a document: verify → encrypt at rest → extract → embed → store metrics
 */
async function stillExists(documentId) {
  const d = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
  return d !== null;
}

async function processDocument(documentId, userId) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;

  try {
    const isImage = doc.fileType !== 'application/pdf';
    let extractedText, pageCount;

    if (isImage) {
      // 1. Read raw buffer
      const rawBuffer = fs.readFileSync(doc.filePath);

      // 2. Verify + extract in ONE Gemini call (saves ~5-10s vs two separate calls)
      const { isMedical, reason, text } = await verifyAndExtractImage(rawBuffer, doc.fileType);
      if (!isMedical) {
        secureDelete(doc.filePath);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'FAILED', extractedText: `NOT_MEDICAL: ${reason}` },
        });
        return;
      }
      extractedText = text;
      pageCount = 1;

      // 3. Encrypt file at rest
      const iv = encryptFileInPlace(doc.filePath);
      if (!await stillExists(documentId)) return;
      await prisma.document.update({ where: { id: documentId }, data: { encryptionIv: iv } });

    } else {
      // 1. For PDFs: extract text first for verification
      const rawBuffer = fs.readFileSync(doc.filePath);
      ({ text: extractedText, pageCount } = await extractTextFromPDF(rawBuffer));

      // 2. Verify
      const { isMedical, reason } = await verifyMedicalDocument(extractedText, false);
      if (!isMedical) {
        secureDelete(doc.filePath);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'FAILED', extractedText: `NOT_MEDICAL: ${reason}` },
        });
        return;
      }

      // 3. Encrypt file at rest
      const iv = encryptFileInPlace(doc.filePath);
      await prisma.document.update({ where: { id: documentId }, data: { encryptionIv: iv } });
    }

    // Check user didn't cancel while AI was processing
    if (!await stillExists(documentId)) return;

    // 5. Split into chunks
    const chunks = await splitIntoChunks(extractedText, {
      documentId,
      userId,
      fileName: doc.fileName,
      fileType: doc.fileType,
    });

    // 6. Embed and store
    await addDocumentToVectorStore(userId, chunks);

    // 7. Extract numeric health metrics (lab reports) + qualitative findings (imaging, prescriptions)
    try {
      const [metrics, findings] = await Promise.all([
        extractHealthMetrics(extractedText, documentId, userId),
        extractDocumentFindings(extractedText, documentId, userId),
      ]);
      if (metrics.length > 0) {
        await prisma.healthMetric.createMany({ data: metrics });
      }
      if (findings.length > 0) {
        await prisma.documentFinding.createMany({ data: findings });
      }
    } catch (metricErr) {
      console.error('Extraction error (non-fatal):', metricErr.message);
    }

    // 8. Mark READY
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY', extractedText, pageCount, vectorStoreId: userId },
    });

  } catch (err) {
    console.error(`Failed to process document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });
  }
}

/**
 * Delete a document: securely wipe file, remove embeddings, delete DB record.
 */
async function deleteDocument(documentId, userId) {
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!doc) throw new Error('Document not found');

  secureDelete(doc.filePath);
  await removeDocumentFromVectorStore(userId, documentId);
  await prisma.document.delete({ where: { id: documentId } });
}

module.exports = { processDocument, deleteDocument };
