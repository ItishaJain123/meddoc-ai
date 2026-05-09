import { jsPDF } from 'jspdf';

const PRIMARY  = [37, 99, 235];   // #2563eb
const SUCCESS  = [5, 150, 105];   // #059669
const WARNING  = [217, 119, 6];   // #d97706
const DANGER   = [220, 38, 38];   // #dc2626
const MUTED    = [100, 116, 139]; // #64748b
const TEXT     = [15, 23, 42];    // #0f172a
const BORDER   = [226, 232, 240]; // #e2e8f0
const BG_LIGHT = [248, 250, 252]; // #f8fafc

function setColor(doc, rgb, type = 'text') {
  if (type === 'text') doc.setTextColor(...rgb);
  else if (type === 'fill') doc.setFillColor(...rgb);
  else if (type === 'draw') doc.setDrawColor(...rgb);
}

function drawHRule(doc, y, margin, pageWidth) {
  setColor(doc, BORDER, 'draw');
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
}

function sectionHeader(doc, text, y, margin) {
  setColor(doc, PRIMARY, 'text');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, y);
  return y + 6;
}

export function generateHealthReportPDF(data, userName) {
  const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const margin   = 18;
  const colW     = pageW - margin * 2;
  let y          = 0;

  // ── Header band ──────────────────────────────────────────────────────────
  setColor(doc, PRIMARY, 'fill');
  doc.rect(0, 0, pageW, 32, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(doc, [255, 255, 255], 'text');
  doc.text('MedDoc AI', margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Health Report', margin, 21);

  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(dateStr, pageW - margin, 14, { align: 'right' });
  if (userName) doc.text(`Patient: ${userName}`, pageW - margin, 21, { align: 'right' });

  y = 44;

  // ── Health Score ──────────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Overall Health Score', y, margin);
  drawHRule(doc, y, margin, pageW);
  y += 6;

  const score = data.healthScore;
  const scoreColor = score == null ? MUTED : score >= 75 ? SUCCESS : score >= 50 ? WARNING : DANGER;
  const scoreLabel = score == null ? 'No data' : score >= 75 ? 'Good' : score >= 50 ? 'Moderate' : 'Needs Attention';

  setColor(doc, scoreColor, 'fill');
  doc.roundedRect(margin, y, 50, 18, 3, 3, 'F');
  setColor(doc, [255, 255, 255], 'text');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(score != null ? `${score}/100` : '—', margin + 25, y + 12, { align: 'center' });

  setColor(doc, TEXT, 'text');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(scoreLabel, margin + 55, y + 8);

  const { totalDocuments, totalMetrics, abnormalCount, criticalCount, conversationCount } = data.stats;
  const statsData = [
    ['Documents Uploaded', totalDocuments],
    ['Lab Metrics Extracted', totalMetrics],
    ['Abnormal Values', abnormalCount],
    ['Critical Values', criticalCount],
    ['AI Conversations', conversationCount],
  ];

  let sx = margin + 55;
  const statColW = (colW - 55) / statsData.length;
  statsData.forEach(([label, value]) => {
    setColor(doc, TEXT, 'text');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value ?? 0), sx + statColW / 2, y + 8, { align: 'center' });
    setColor(doc, MUTED, 'text');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, sx + statColW / 2, y + 14, { align: 'center' });
    sx += statColW;
  });

  y += 28;

  // ── Metrics Breakdown ─────────────────────────────────────────────────────
  if (data.metricsBreakdown?.length > 0) {
    y = sectionHeader(doc, 'Lab Values Breakdown', y, margin);
    drawHRule(doc, y, margin, pageW);
    y += 6;

    const bkColors = { Normal: SUCCESS, Abnormal: WARNING, Critical: DANGER };
    const totalVals = data.metricsBreakdown.reduce((s, d) => s + d.value, 0);
    const barH = 7;
    const barW = colW;

    // Stacked bar
    let bx = margin;
    data.metricsBreakdown.forEach(({ name, value }) => {
      const w = (value / totalVals) * barW;
      setColor(doc, bkColors[name] || MUTED, 'fill');
      doc.rect(bx, y, w, barH, 'F');
      bx += w;
    });
    y += barH + 4;

    // Legend
    data.metricsBreakdown.forEach(({ name, value }) => {
      setColor(doc, bkColors[name] || MUTED, 'fill');
      doc.roundedRect(margin, y, 3, 3, 0.5, 0.5, 'F');
      setColor(doc, TEXT, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const pct = totalVals > 0 ? Math.round((value / totalVals) * 100) : 0;
      doc.text(`${name}: ${value} (${pct}%)`, margin + 5, y + 2.5);
      y += 6;
    });
    y += 4;
  }

  // ── Top Flagged Metrics ───────────────────────────────────────────────────
  if (data.topFlagged?.length > 0) {
    y = sectionHeader(doc, 'Metrics Needing Attention', y, margin);
    drawHRule(doc, y, margin, pageW);
    y += 4;

    const maxAbnormal = Math.max(...data.topFlagged.map((d) => d.abnormal), 1);

    data.topFlagged.forEach(({ name, abnormal, total }) => {
      if (y > pageH - 30) { doc.addPage(); y = 20; }
      setColor(doc, TEXT, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(name, margin, y + 3.5);

      const barStart = margin + 55;
      const barMaxW  = colW - 55 - 25;
      const bW       = (abnormal / maxAbnormal) * barMaxW;

      setColor(doc, BG_LIGHT, 'fill');
      doc.roundedRect(barStart, y, barMaxW, 6, 1, 1, 'F');
      setColor(doc, DANGER, 'fill');
      doc.roundedRect(barStart, y, bW, 6, 1, 1, 'F');

      setColor(doc, MUTED, 'text');
      doc.setFontSize(7.5);
      doc.text(`${abnormal}/${total} reports`, barStart + barMaxW + 3, y + 4.5);
      y += 10;
    });
    y += 4;
  }

  // ── Recent Findings ───────────────────────────────────────────────────────
  if (data.findings?.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = 20; }
    y = sectionHeader(doc, 'Imaging & Clinical Findings', y, margin);
    drawHRule(doc, y, margin, pageW);
    y += 4;

    const sevColor = { Normal: SUCCESS, Mild: WARNING, Moderate: WARNING, Severe: DANGER, Critical: DANGER };
    data.findings.forEach((f) => {
      if (y > pageH - 20) { doc.addPage(); y = 20; }

      const col = sevColor[f.severity] || MUTED;
      setColor(doc, col, 'fill');
      doc.roundedRect(margin, y, colW, 14, 2, 2, 'F');

      setColor(doc, [255, 255, 255], 'text');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${f.documentType}${f.bodyPart ? ' — ' + f.bodyPart : ''}  |  ${f.severity}`, margin + 3, y + 4.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(f.finding, colW - 6);
      doc.text(lines[0], margin + 3, y + 10);
      y += 18;
    });
    y += 4;
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────
  if (y > pageH - 25) { doc.addPage(); y = 20; }
  drawHRule(doc, y, margin, pageW);
  y += 5;
  setColor(doc, MUTED, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const disclaimer = 'Medical Disclaimer: MedDoc AI provides informational assistance only and does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.';
  const dLines = doc.splitTextToSize(disclaimer, colW);
  doc.text(dLines, margin, y);

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setColor(doc, MUTED, 'text');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  doc.save(`MedDoc_Health_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
