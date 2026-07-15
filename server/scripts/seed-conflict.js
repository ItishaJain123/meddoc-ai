const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const EXISTING_DOC_ID = 'f3c50c69-d443-4237-9e6f-8525705d965e';

async function main() {
  // Fetch userId from existing document
  const existing = await prisma.document.findUnique({
    where: { id: EXISTING_DOC_ID },
    select: { userId: true },
  });
  if (!existing) throw new Error('Existing document not found — check the ID');
  const { userId } = existing;

  // Create second fake document
  const doc2 = await prisma.document.create({
    data: {
      userId,
      fileName: 'Blood Test - March 2026.pdf',
      fileType: 'application/pdf',
      filePath: 'uploads/fake-march-2026.pdf',
      fileSize: 98304,
      status: 'READY',
      pageCount: 2,
      extractedText: 'Complete Blood Count — March 2026. Haemoglobin: 15 g/dL (Normal).',
    },
  });
  console.log('Created document:', doc2.id, doc2.fileName);

  // Insert conflicting Haemoglobin metric (15 g/dL — normal, vs 10.8 in doc1)
  const metric = await prisma.healthMetric.create({
    data: {
      userId,
      documentId: doc2.id,
      metricName: 'Haemoglobin',
      value: 15,
      unit: 'g/dL',
      refRangeLow: 13,
      refRangeHigh: 17,
      isAbnormal: false,
      isCritical: false,
      reportDate: new Date('2026-03-10'),
    },
  });
  console.log('Created metric:', metric.id, `Haemoglobin = ${metric.value} ${metric.unit}`);
  console.log('\nConflict seeded successfully!');
  console.log('Doc1: Lab Report - John Doe.pdf  → Haemoglobin 10.8 g/dL (Apr 2026, ABNORMAL)');
  console.log('Doc2: Blood Test - March 2026.pdf → Haemoglobin 15 g/dL   (Mar 2026, Normal)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
