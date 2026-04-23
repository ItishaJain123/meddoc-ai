const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_SEVERITIES = ['Normal', 'Mild', 'Moderate', 'Severe', 'Critical'];

function parseJsonArray(raw) {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Extract first JSON array
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

async function extractDocumentFindings(extractedText, documentId, userId) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  });

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a medical findings extractor. Extract qualitative clinical findings from the medical document text below.

IMPORTANT: Do NOT extract numeric lab values (blood counts, glucose levels, haemoglobin values, etc.) — those are handled by a separate system.

Extract findings for these document types ONLY:
- X-Ray: describe what is visible (fractures, opacities, organ size, alignment)
- Sonography / Ultrasound: organ observations, cysts, masses, measurements with context
- MRI / CT Scan: lesions, structural observations, abnormalities
- Prescription: each medication with dosage and purpose as a separate finding. For prescriptions, the documentType MUST be "Prescription".
- ECG: rhythm findings, abnormalities
- Discharge Summary: primary diagnosis, procedures done, follow-up instructions
- Doctor Notes: key diagnoses or clinical impressions

PRESCRIPTION HANDLING (very important):
- If the document mentions medicines, drugs, tablets, capsules, or dosage instructions → it is a Prescription.
- Extract EACH medication as a separate finding entry.
- finding format: "<MedicineName> <Dose> — <Frequency/Instructions>"
- Example: "Metformin 500mg — twice daily after meals for diabetes"

For each finding return:
- documentType: one of "X-Ray" | "Sonography" | "MRI" | "CT Scan" | "Prescription" | "ECG" | "Discharge Summary" | "Doctor Notes" | "Other"
- bodyPart: organ or body region — null if not applicable (null for most prescriptions)
- finding: plain English description, 15-200 characters
- severity: one of "Normal" | "Mild" | "Moderate" | "Severe" | "Critical"
- isAbnormal: false for routine prescriptions/medications, true only if the finding is concerning
- reportDate: YYYY-MM-DD format — use "${today}" if date not found in document

Rules:
- Return up to 15 findings (more for prescriptions with many medications)
- If the document is a pure numeric lab report (only blood test numbers with no qualitative text), return []
- Do not repeat the same finding twice
- Use simple, clear language
- Respond with ONLY a valid JSON array, no markdown fences, no explanation text

Document text:
---
${extractedText.slice(0, 8000)}
---`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    console.log('[findingExtractor] raw response (first 300):', raw.slice(0, 300));

    let findings;
    try {
      findings = parseJsonArray(raw);
    } catch (parseErr) {
      console.error('[findingExtractor] JSON parse error:', parseErr.message, '| raw:', raw.slice(0, 200));
      return [];
    }

    if (!findings || !Array.isArray(findings)) {
      console.error('[findingExtractor] result is not an array:', raw.slice(0, 200));
      return [];
    }

    console.log(`[findingExtractor] extracted ${findings.length} findings for document ${documentId}`);

    return findings
      .filter((f) => f && typeof f.finding === 'string' && f.finding.trim().length > 0)
      .map((f) => ({
        documentId,
        userId,
        documentType: String(f.documentType || 'Other').trim(),
        bodyPart:     f.bodyPart ? String(f.bodyPart).trim() : null,
        finding:      String(f.finding).trim().slice(0, 500),
        severity:     VALID_SEVERITIES.includes(f.severity) ? f.severity : 'Normal',
        isAbnormal:   Boolean(f.isAbnormal),
        reportDate:   new Date(f.reportDate || today),
      }));
  } catch (err) {
    console.error('[findingExtractor] extraction failed:', err.message);
    return [];
  }
}

module.exports = { extractDocumentFindings };
