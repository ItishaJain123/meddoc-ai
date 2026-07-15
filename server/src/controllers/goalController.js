const prisma = require('../config/db');
const { matchReadings, computeGoalProgress } = require('../utils/goalProgress');

async function getGoals(req, res) {
  const userId = req.user.id;

  const goals = await prisma.healthGoal.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  // All readings oldest-first: first match = baseline, last match = latest
  const allMetrics = await prisma.healthMetric.findMany({
    where: { userId },
    orderBy: { reportDate: 'asc' },
    select: { value: true, unit: true, reportDate: true, metricName: true },
  });

  const goalsWithProgress = goals.map((goal) => {
    const readings = matchReadings(allMetrics, goal.metricName);
    const latest = readings[readings.length - 1] ?? null;
    const baseline = readings[0] ?? null;
    const currentValue = latest?.value ?? null;

    const { achieved, progress } = computeGoalProgress(
      goal.direction, goal.targetValue, currentValue, baseline?.value ?? null,
    );

    return {
      ...goal,
      currentValue,
      baselineValue: baseline?.value ?? null,
      unit: latest?.unit ?? goal.unit,
      matchedMetricName: latest?.metricName ?? goal.metricName,
      lastUpdated: latest?.reportDate ?? null,
      achieved,
      progress,
    };
  });

  res.json(goalsWithProgress);
}

async function createGoal(req, res) {
  const userId = req.user.id;
  const { metricName, targetValue, direction, unit } = req.body;

  if (!metricName?.trim() || targetValue == null || !direction) {
    return res.status(400).json({ error: 'metricName, targetValue and direction are required' });
  }
  if (!['above', 'below'].includes(direction)) {
    return res.status(400).json({ error: 'direction must be "above" or "below"' });
  }

  const existing = await prisma.healthGoal.findFirst({
    where: { userId, metricName: metricName.trim(), isActive: true },
  });
  if (existing) {
    return res.status(409).json({ error: `A goal for "${metricName}" already exists. Delete it first to create a new one.` });
  }

  const goal = await prisma.healthGoal.create({
    data: {
      userId,
      metricName: metricName.trim(),
      targetValue: parseFloat(targetValue),
      direction,
      unit: unit?.trim() || null,
    },
  });

  res.status(201).json(goal);
}

async function deleteGoal(req, res) {
  const goal = await prisma.healthGoal.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  await prisma.healthGoal.delete({ where: { id: req.params.id } });
  res.json({ message: 'Goal deleted' });
}

// Latest reading per distinct metric — value + safe range let the client
// prefill sensible targets and suggest goals for abnormal values
async function getAvailableMetrics(req, res) {
  const metrics = await prisma.healthMetric.findMany({
    where: { userId: req.user.id },
    orderBy: { reportDate: 'desc' },
    select: {
      metricName: true, unit: true, value: true,
      refRangeLow: true, refRangeHigh: true,
      isAbnormal: true, isCritical: true, reportDate: true,
    },
  });

  const latestPerMetric = new Map();
  for (const m of metrics) {
    if (!latestPerMetric.has(m.metricName)) latestPerMetric.set(m.metricName, m);
  }

  res.json(
    [...latestPerMetric.values()].sort((a, b) => a.metricName.localeCompare(b.metricName)),
  );
}

module.exports = { getGoals, createGoal, deleteGoal, getAvailableMetrics };
