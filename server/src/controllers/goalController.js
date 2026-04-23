const prisma = require('../config/db');

async function getGoals(req, res) {
  const userId = req.user.id;

  const goals = await prisma.healthGoal.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all metrics once, match in JS to handle partial names both ways
  const allMetrics = await prisma.healthMetric.findMany({
    where: { userId },
    orderBy: { reportDate: 'desc' },
    select: { value: true, unit: true, reportDate: true, metricName: true },
  });

  console.log('[Goals Debug] userId:', userId);
  console.log('[Goals Debug] allMetrics count:', allMetrics.length);
  console.log('[Goals Debug] stored metric names:', allMetrics.map(m => m.metricName));
  console.log('[Goals Debug] goals:', goals.map(g => g.metricName));

  const goalsWithProgress = goals.map((goal) => {
      const goalName = goal.metricName.toLowerCase().trim();
      const latest = allMetrics.find((m) => {
        const stored = m.metricName.toLowerCase().trim();
        return stored === goalName || stored.includes(goalName) || goalName.includes(stored);
      });

      console.log(`[Goals Debug] goal="${goal.metricName}" → matched="${latest?.metricName ?? 'NONE'}" value=${latest?.value}`);

      const currentValue = latest?.value ?? null;
      let achieved = null;
      let progress = 0;

      if (currentValue !== null) {
        achieved = goal.direction === 'above'
          ? currentValue >= goal.targetValue
          : currentValue <= goal.targetValue;

        progress = goal.direction === 'above'
          ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
          : currentValue > 0
            ? Math.min(100, Math.round((goal.targetValue / currentValue) * 100))
            : 0;
      }

      return {
        ...goal,
        currentValue,
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

async function getAvailableMetrics(req, res) {
  const metrics = await prisma.healthMetric.findMany({
    where: { userId: req.user.id },
    distinct: ['metricName'],
    select: { metricName: true, unit: true },
    orderBy: { metricName: 'asc' },
  });
  res.json(metrics);
}

module.exports = { getGoals, createGoal, deleteGoal, getAvailableMetrics };
