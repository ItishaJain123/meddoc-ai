const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Verify whether a document is a medical document.
 * For images: pass base64 content + mimeType.
 * For PDFs: pass extracted text as content, isImage = false.
 * Returns { isMedical, documentType, reason }
 */
async function verifyMedicalDocument(
  content,
  isImage = false,
  mimeType = null,
) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model:
      process.env.GEMINI_VERIFICATION_MODEL || 'gemini-2.0-flash-lite',
  });

  const verifyPrompt = `You are a strict medical document classifier. Determine whether the provided content is a legitimate medical document or medical image.

MEDICAL content includes:
- Lab reports, blood tests, urine tests, pathology reports
- Prescriptions and medication lists
- Doctor's notes, clinical notes, discharge summaries
- Radiology reports, X-rays, MRI scans, CT scans, ultrasounds, sonography
- ECG / EKG reports
- Vaccination records, immunization certificates
- Medical certificates, fitness certificates
- Ophthalmology, dental, or specialist consultation reports
- Hospital bills with medical procedure details

NOT MEDICAL content includes:
- Regular photos, selfies, landscapes, food images, screenshots
- General invoices or receipts without medical context
- Legal or financial documents
- News articles, academic non-medical papers
- Any general non-healthcare content

Respond with ONLY valid JSON (no markdown, no code blocks):
{"isMedical": true, "documentType": "Lab Report", "reason": "Contains CBC blood test results with reference ranges"}`;

  let result;
  if (isImage) {
    result = await model.generateContent([
      { inlineData: { data: content, mimeType } },
      verifyPrompt,
    ]);
  } else {
    const preview = content.slice(0, 3000);
    result = await model.generateContent(
      `${verifyPrompt}\n\nDocument text to classify:\n---\n${preview}\n---`,
    );
  }

  const responseText = result.response.text().trim();
  const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    throw new Error("Verification service returned an invalid response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Extract text from a PDF — accepts a file path or a Buffer directly.
 */
async function extractTextFromPDF(filePathOrBuffer) {
  const dataBuffer = Buffer.isBuffer(filePathOrBuffer)
    ? filePathOrBuffer
    : fs.readFileSync(filePathOrBuffer);
  const data = await pdfParse(dataBuffer);
  return { text: data.text, pageCount: data.numpages };
}

/**
 * Verify + extract text from an image in a single Gemini call.
 * Returns { isMedical, documentType, reason, text }
 */
async function verifyAndExtractImage(buffer, mimeType) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash',
  });

  const base64Image = buffer.toString('base64');

  const prompt = `You are analyzing an image uploaded to a medical document app.

STEP 1 — Classify: Is this a legitimate medical document or medical image?
Medical = lab reports, blood tests, prescriptions, X-rays, MRI, CT, ultrasound, ECG, doctor notes, discharge summaries, vaccination records.
NOT medical = regular photos, selfies, food, screenshots, non-medical invoices.

STEP 2 — If medical, fully analyze and extract all information:
- For lab reports / prescriptions / text documents: transcribe ALL visible text, values, units, reference ranges, dates, names.
- For X-rays: describe body part, view, abnormalities, bone density, alignment, any visible text/labels.
- For ultrasound/sonography: describe organ, size, echogenicity, measurements, any anomalies.
- For MRI/CT: describe region, structures, abnormalities, visible annotations.
- Always transcribe every number, date, and label visible on the image.

Respond with ONLY valid JSON in this exact format:
{
  "isMedical": true,
  "documentType": "Lab Report",
  "reason": "CBC blood test with reference ranges",
  "extractedText": "...full extraction here..."
}
If not medical: { "isMedical": false, "documentType": null, "reason": "...", "extractedText": "" }`;

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    prompt,
  ]);

  const raw = result.response.text().trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Vision model returned invalid response');

  const parsed = JSON.parse(match[0]);
  return {
    isMedical: Boolean(parsed.isMedical),
    documentType: parsed.documentType || null,
    reason: parsed.reason || '',
    text: parsed.extractedText || '',
  };
}

/**
 * Extract text from an image — kept for direct use if needed.
 */
async function extractTextFromImage(filePathOrObj) {
  let buffer, mimeType;
  if (typeof filePathOrObj === 'object' && filePathOrObj.buffer) {
    buffer = filePathOrObj.buffer;
    mimeType = filePathOrObj.mimeType;
  } else {
    buffer = fs.readFileSync(filePathOrObj);
    mimeType = filePathOrObj.endsWith('.png') ? 'image/png' : 'image/jpeg';
  }
  const result = await verifyAndExtractImage(buffer, mimeType);
  return { text: result.text, pageCount: 1 };
}

/**
 * Split extracted text into chunks with metadata
 */
async function splitIntoChunks(text, metadata) {
  const docs = await textSplitter.createDocuments([text], [metadata]);
  return docs;
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  verifyAndExtractImage,
  splitIntoChunks,
  verifyMedicalDocument,
};
