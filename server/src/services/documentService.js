const fs = require('fs');
const prisma = require('../config/db');
const { extractTextFromPDF, verifyAndExtractImage, splitIntoChunks, verifyMedicalDocument } = require('../agents/documentProcessor');
const { addDocumentToVectorStore, removeDocumentFromVectorStore } = require('../agents/embeddingService');
const { extractHealthMetrics } = require('../agents/metricExtractor');
const { extractDocumentFindings } = require('../agents/findingExtractor');
const { extractPatientName } = require('../agents/patientIdentity');
const { matchesOwner } = require('../utils/nameMatch');
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

    // 4. Identity guard — a user may only upload their OWN reports.
    //    First readable report defines the account owner; later reports must
    //    match it (fuzzily) or they are held for confirmation. Runs BEFORE any
    //    embedding / metric extraction so a mismatched report never pollutes
    //    the dashboard, trends, or RAG context.
    const patientName = await extractPatientName(extractedText);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientName: true, patientAliases: true },
    });

    if (user?.patientName) {
      const aliases = Array.isArray(user.patientAliases) ? user.patientAliases : [];
      const { match, unknown } = matchesOwner(patientName, user.patientName, aliases);
      if (!unknown && !match) {
        // Hold the report: keep the (encrypted) file and extracted text so the
        // user can confirm "This is me" later, but save nothing derived from it.
        if (!await stillExists(documentId)) return;
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'FAILED',
            extractedText,
            pageCount,
            extractedPatientName: patientName,
            identityMismatch: true,
          },
        });
        return;
      }
    } else if (patientName) {
      // First report with a readable name defines the account owner.
      await prisma.user.update({ where: { id: userId }, data: { patientName } });
    }

    // 5–8. Embed, extract metrics/findings, mark READY.
    await finalizeReadyDocument(documentId, userId, extractedText, pageCount, patientName);

  } catch (err) {
    console.error(`Failed to process document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', extractedText: `ERROR: ${err.message}` },
    }).catch(() => {});
  }
}

/**
 * Steps 5–8 of processing: chunk → embed → extract metrics/findings → mark READY.
 * Factored out so the "This is me" override can finish a held document straight
 * from its already-extracted text, without re-reading the encrypted file.
 */
async function finalizeReadyDocument(documentId, userId, extractedText, pageCount, patientName) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;

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
    data: {
      status: 'READY',
      extractedText,
      pageCount,
      vectorStoreId: userId,
      extractedPatientName: patientName ?? undefined,
      identityMismatch: false,
    },
  });
}

/**
 * "This is me" override for a report held by the identity guard.
 * Records the report's patient name as an accepted alias (so future reports
 * with that spelling pass automatically) and finishes processing it.
 */
async function confirmDocumentIdentity(documentId, userId) {
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!doc) throw new Error('Document not found');
  if (!doc.identityMismatch) throw new Error('Document is not held for identity confirmation');
  if (!doc.extractedText) throw new Error('No extracted text available to finalize');

  // Add the report's name as an accepted alias for this account.
  if (doc.extractedPatientName) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientAliases: true },
    });
    const aliases = new Set(Array.isArray(user?.patientAliases) ? user.patientAliases : []);
    if (!aliases.has(doc.extractedPatientName)) {
      aliases.add(doc.extractedPatientName);
      await prisma.user.update({
        where: { id: userId },
        data: { patientAliases: [...aliases] },
      });
    }
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PROCESSING', identityMismatch: false },
  });

  await finalizeReadyDocument(documentId, userId, doc.extractedText, doc.pageCount, doc.extractedPatientName);
}

/**
 * Delete a document and ALL of the user's data derived from it:
 *   - securely wipes the encrypted file on disk (if any)
 *   - removes its embeddings from the vector store (RAG context)
 *   - deletes the DB record; HealthMetric + DocumentFinding rows cascade-delete
 *     via the Prisma schema (onDelete: Cascade)
 * A file-wipe failure must never prevent the vector-store / DB cleanup.
 */
async function deleteDocument(documentId, userId) {
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!doc) throw new Error('Document not found');

  try {
    if (doc.filePath) secureDelete(doc.filePath);
  } catch (err) {
    console.error(`secureDelete failed for ${documentId} (continuing with data removal):`, err.message);
  }

  await removeDocumentFromVectorStore(userId, documentId);
  await prisma.document.delete({ where: { id: documentId } });
}

module.exports = { processDocument, deleteDocument, confirmDocumentIdentity };
