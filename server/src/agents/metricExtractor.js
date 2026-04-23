const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extract structured health metrics from document text using Gemini.
 * Returns array of metric objects ready to insert into HealthMetric table.
 */
async function extractHealthMetrics(extractedText, documentId, userId) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_VERIFICATION_MODEL || 'gemini-2.0-flash-lite',
  });

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a medical data extractor. Extract every measurable lab value or health metric from the document below.

For each metric return:
- metricName: standardised English name (e.g. "Haemoglobin", "RBC Count", "Fasting Glucose", "Platelet Count")
- value: the numeric result as a number (no units, no text)
- unit: unit of measurement (e.g. "g/dL", "cells/µL", "mg/dL") or null
- refRangeLow: lower reference range as number or null
- refRangeHigh: upper reference range as number or null
- isAbnormal: true if value is outside reference range, otherwise false
- isCritical: true if the value is at a life-threatening level (see thresholds below), otherwise false
- reportDate: date of the report in YYYY-MM-DD format. If not found use "${today}".

Critical thresholds:
- Haemoglobin < 7 g/dL → critical
- Platelet Count < 50000 /µL → critical
- WBC < 2000 /µL OR > 30000 /µL → critical
- Fasting Blood Glucose < 50 mg/dL OR > 400 mg/dL → critical
- Potassium < 2.5 mEq/L OR > 6.5 mEq/L → critical
- Sodium < 120 mEq/L OR > 160 mEq/L → critical

Respond with ONLY a valid JSON array. Return [] if no numeric metrics are found.
Example:
[
  {"metricName":"Haemoglobin","value":10.8,"unit":"g/dL","refRangeLow":13.0,"refRangeHigh":17.0,"isAbnormal":true,"isCritical":false,"reportDate":"2026-04-18"},
  {"metricName":"WBC Count","value":7400,"unit":"cells/µL","refRangeLow":4000,"refRangeHigh":11000,"isAbnormal":false,"isCritical":false,"reportDate":"2026-04-18"}
]

Document text:
---
${extractedText.slice(0, 6000)}
---`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const metrics = JSON.parse(match[0]);
    return metrics.map((m) => ({
      documentId,
      userId,
      metricName: String(m.metricName || '').trim(),
      value: parseFloat(m.value),
      unit: m.unit || null,
      refRangeLow: m.refRangeLow != null ? parseFloat(m.refRangeLow) : null,
      refRangeHigh: m.refRangeHigh != null ? parseFloat(m.refRangeHigh) : null,
      isAbnormal: Boolean(m.isAbnormal),
      isCritical: Boolean(m.isCritical),
      reportDate: new Date(m.reportDate || today),
    })).filter((m) => m.metricName && !isNaN(m.value));
  } catch (err) {
    console.error('Metric extraction failed:', err.message);
    return [];
  }
}

module.exports = { extractHealthMetrics };
