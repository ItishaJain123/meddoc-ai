/**
 * Sample medical data used by the demo / "Try with sample report" mode.
 * All values are fictional but medically plausible, and tell a story:
 * the January report shows borderline diabetes + high cholesterol,
 * the June report shows improvement after lifestyle changes + medication.
 */

const REPORT_JAN_TEXT = `CITY DIAGNOSTICS LABORATORY
Patient: Demo Patient          Age/Sex: 34 / F
Sample Collected: 10-Jan-2026  Reported: 11-Jan-2026
Referred by: Dr. A. Mehta, MD (Internal Medicine)

COMPLETE BLOOD COUNT (CBC)
Haemoglobin              12.6  g/dL     (Ref: 12.0 - 15.5)
RBC Count                4.4   million/uL (Ref: 3.8 - 4.8)
WBC Count                7800  cells/uL (Ref: 4000 - 11000)
Platelet Count           245000 /uL     (Ref: 150000 - 410000)

DIABETES PROFILE
Fasting Glucose          118   mg/dL    (Ref: 70 - 100)   HIGH
HbA1c                    6.1   %        (Ref: 4.0 - 5.6)  HIGH

LIPID PROFILE
Total Cholesterol        228   mg/dL    (Ref: 125 - 200)  HIGH
LDL Cholesterol          152   mg/dL    (Ref: 0 - 100)    HIGH
HDL Cholesterol          42    mg/dL    (Ref: 40 - 60)
Triglycerides            176   mg/dL    (Ref: 0 - 150)    HIGH

OTHER
TSH                      2.8   uIU/mL   (Ref: 0.4 - 4.2)
Vitamin D (25-OH)        16    ng/mL    (Ref: 30 - 100)   LOW

IMPRESSION:
Impaired fasting glucose with HbA1c in the prediabetic range.
Dyslipidemia with elevated LDL cholesterol and triglycerides.
Vitamin D deficiency. Recommend dietary modification, regular
exercise, vitamin D supplementation, and repeat testing in 3-6 months.`;

const REPORT_JUN_TEXT = `CITY DIAGNOSTICS LABORATORY
Patient: Demo Patient          Age/Sex: 34 / F
Sample Collected: 15-Jun-2026  Reported: 16-Jun-2026
Referred by: Dr. A. Mehta, MD (Internal Medicine)

COMPLETE BLOOD COUNT (CBC)
Haemoglobin              13.4  g/dL     (Ref: 12.0 - 15.5)
RBC Count                4.6   million/uL (Ref: 3.8 - 4.8)
WBC Count                6900  cells/uL (Ref: 4000 - 11000)
Platelet Count           262000 /uL     (Ref: 150000 - 410000)

DIABETES PROFILE
Fasting Glucose          96    mg/dL    (Ref: 70 - 100)
HbA1c                    5.6   %        (Ref: 4.0 - 5.6)

LIPID PROFILE
Total Cholesterol        189   mg/dL    (Ref: 125 - 200)
LDL Cholesterol          118   mg/dL    (Ref: 0 - 100)    HIGH
HDL Cholesterol          48    mg/dL    (Ref: 40 - 60)
Triglycerides            139   mg/dL    (Ref: 0 - 150)

OTHER
TSH                      2.5   uIU/mL   (Ref: 0.4 - 4.2)
Vitamin D (25-OH)        34    ng/mL    (Ref: 30 - 100)

IMPRESSION:
Marked improvement compared to January 2026 report. Fasting glucose
and HbA1c have normalised. Lipid profile significantly improved;
LDL cholesterol still mildly elevated - continue current management.
Vitamin D now in sufficient range. Continue medication and lifestyle
measures, review in 6 months.`;

const PRESCRIPTION_TEXT = `Dr. A. Mehta, MD (Internal Medicine)
City Care Clinic — Reg. No. 48213
Date: 15-Jun-2026
Patient: Demo Patient, 34/F

Rx
1. Tab Metformin 500 mg — 1 tablet twice daily after meals
   (for blood sugar control)
2. Tab Atorvastatin 10 mg — 1 tablet at bedtime
   (for cholesterol management)
3. Cap Vitamin D3 60,000 IU — once weekly for 8 weeks, then monthly
   (for vitamin D deficiency)

Advice: 30 minutes brisk walking daily, reduce refined sugar and
fried food, follow-up with fasting lipid profile in 6 months.`;

// value/ref data mirrors the report text above
function metricsFor(documentId, userId, reportDate, values) {
  return values.map((v) => ({
    documentId,
    userId,
    reportDate,
    metricName: v[0],
    value: v[1],
    unit: v[2],
    refRangeLow: v[3],
    refRangeHigh: v[4],
    isAbnormal: v[3] != null && v[4] != null ? v[1] < v[3] || v[1] > v[4] : false,
    isCritical: false,
  }));
}

const JAN_DATE = new Date('2026-01-10');
const JUN_DATE = new Date('2026-06-15');

const JAN_VALUES = [
  ['Haemoglobin', 12.6, 'g/dL', 12.0, 15.5],
  ['RBC Count', 4.4, 'million/µL', 3.8, 4.8],
  ['WBC Count', 7800, 'cells/µL', 4000, 11000],
  ['Platelet Count', 245000, '/µL', 150000, 410000],
  ['Fasting Glucose', 118, 'mg/dL', 70, 100],
  ['HbA1c', 6.1, '%', 4.0, 5.6],
  ['Total Cholesterol', 228, 'mg/dL', 125, 200],
  ['LDL Cholesterol', 152, 'mg/dL', 0, 100],
  ['HDL Cholesterol', 42, 'mg/dL', 40, 60],
  ['Triglycerides', 176, 'mg/dL', 0, 150],
  ['TSH', 2.8, 'µIU/mL', 0.4, 4.2],
  ['Vitamin D', 16, 'ng/mL', 30, 100],
];

const JUN_VALUES = [
  ['Haemoglobin', 13.4, 'g/dL', 12.0, 15.5],
  ['RBC Count', 4.6, 'million/µL', 3.8, 4.8],
  ['WBC Count', 6900, 'cells/µL', 4000, 11000],
  ['Platelet Count', 262000, '/µL', 150000, 410000],
  ['Fasting Glucose', 96, 'mg/dL', 70, 100],
  ['HbA1c', 5.6, '%', 4.0, 5.6],
  ['Total Cholesterol', 189, 'mg/dL', 125, 200],
  ['LDL Cholesterol', 118, 'mg/dL', 0, 100],
  ['HDL Cholesterol', 48, 'mg/dL', 40, 60],
  ['Triglycerides', 139, 'mg/dL', 0, 150],
  ['TSH', 2.5, 'µIU/mL', 0.4, 4.2],
  ['Vitamin D', 34, 'ng/mL', 30, 100],
];

const DEMO_DOCS = [
  {
    fileName: 'Sample — Blood Test (Jan 2026).pdf',
    text: REPORT_JAN_TEXT,
    reportDate: JAN_DATE,
    values: JAN_VALUES,
    findings: [
      {
        documentType: 'Doctor Notes',
        bodyPart: 'Metabolic',
        finding: 'Impaired fasting glucose with HbA1c in the prediabetic range; dyslipidemia with elevated LDL and triglycerides; vitamin D deficiency.',
        severity: 'Mild',
        isAbnormal: true,
      },
    ],
  },
  {
    fileName: 'Sample — Blood Test (Jun 2026).pdf',
    text: REPORT_JUN_TEXT,
    reportDate: JUN_DATE,
    values: JUN_VALUES,
    findings: [
      {
        documentType: 'Doctor Notes',
        bodyPart: 'Metabolic',
        finding: 'Marked improvement since January: glucose and HbA1c normalised, lipid profile improved. LDL still mildly elevated — continue current management.',
        severity: 'Normal',
        isAbnormal: false,
      },
    ],
  },
  {
    fileName: 'Sample — Prescription (Jun 2026).pdf',
    text: PRESCRIPTION_TEXT,
    reportDate: JUN_DATE,
    values: [],
    findings: [
      {
        documentType: 'Prescription',
        bodyPart: null,
        finding: 'Metformin 500 mg — 1 tablet twice daily after meals (blood sugar control)',
        severity: 'Normal',
        isAbnormal: false,
      },
      {
        documentType: 'Prescription',
        bodyPart: null,
        finding: 'Atorvastatin 10 mg — 1 tablet at bedtime (cholesterol management)',
        severity: 'Normal',
        isAbnormal: false,
      },
      {
        documentType: 'Prescription',
        bodyPart: null,
        finding: 'Vitamin D3 60,000 IU — once weekly for 8 weeks, then monthly (vitamin D deficiency)',
        severity: 'Normal',
        isAbnormal: false,
      },
    ],
  },
];

module.exports = { DEMO_DOCS, metricsFor };
