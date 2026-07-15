const { GoogleGenerativeAI } = require("@google/generative-ai");
const { retryWithBackoff } = require("../utils/retryWithBackoff");

/**
 * Read the patient's name off a medical report.
 *
 * Used by the "own reports only" guard: the first report defines the account
 * owner, and every later report's name is matched against it. This is a small,
 * cheap call over just the top of the document (the patient name is virtually
 * always in the header). It FAILS OPEN — any error, or a report with no clearly
 * printed name, returns null, and the caller then allows the upload rather than
 * blocking on an unreadable name.
 *
 * @returns {Promise<string|null>} the patient name, or null if none is found.
 */
async function extractPatientName(extractedText) {
  if (!extractedText || !extractedText.trim()) return null;

  try {
    const genAI = new GoogleGenerativeAI(process.env.MEDDOC_GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.MEDDOC_GEMINI_MODEL,
    });

    const prompt = `You are extracting the PATIENT'S name from a medical report.

Rules:
- Return ONLY the patient's full name — the person the report is about.
- Do NOT return the doctor's name, hospital name, lab name, or a referring physician.
- Ignore titles like Mr./Mrs./Ms./Dr. in the value.
- If no patient name is clearly present, return null.

Respond with ONLY valid JSON (no markdown, no code block):
{"patientName": "Full Name"}   or   {"patientName": null}

Report text (header):
---
${extractedText.slice(0, 2000)}
---`;

    const result = await retryWithBackoff(() => model.generateContent(prompt));
    const raw = result.response.text().trim();
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const name = parsed.patientName;
    if (!name || typeof name !== "string") return null;
    const trimmed = name.trim();
    return trimmed.length ? trimmed : null;
  } catch (err) {
    console.error("Patient-name extraction failed (fail-open):", err.message);
    return null;
  }
}

module.exports = { extractPatientName };
