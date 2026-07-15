/**
 * Find the stored readings that belong to a goal's metric.
 * Prefers an exact (case-insensitive) name match; only when nothing matches
 * exactly does it fall back to substring matching — so a goal named
 * "Cholesterol" can't silently latch onto "HDL Cholesterol" when a
 * "Cholesterol" metric exists.
 * Preserves the input order (callers pass readings sorted by reportDate).
 */
function matchReadings(metrics, goalMetricName) {
  const goalName = goalMetricName.toLowerCase().trim();
  const exact = metrics.filter((m) => m.metricName.toLowerCase().trim() === goalName);
  if (exact.length > 0) return exact;
  return metrics.filter((m) => {
    const s = m.metricName.toLowerCase().trim();
    return s.includes(goalName) || goalName.includes(s);
  });
}

/**
 * Progress toward a goal.
 *  - achieved → 100
 *  - with a baseline (the earliest reading), progress measures how far the
 *    value has actually MOVED from the baseline toward the target — so an
 *    out-of-range value never shows a misleading "85%" merely for being
 *    numerically close to the target
 *  - with a single reading there is no movement to measure, so fall back to
 *    a closeness ratio scaled to max 90 — an unmet goal never looks "done"
 */
function computeGoalProgress(direction, targetValue, currentValue, baselineValue) {
  if (currentValue == null) return { achieved: null, progress: 0 };

  const achieved = direction === 'above'
    ? currentValue >= targetValue
    : currentValue <= targetValue;
  if (achieved) return { achieved: true, progress: 100 };

  let progress = 0;
  if (baselineValue != null && baselineValue !== currentValue) {
    const total = direction === 'above' ? targetValue - baselineValue : baselineValue - targetValue;
    const moved = direction === 'above' ? currentValue - baselineValue : baselineValue - currentValue;
    if (total > 0) progress = Math.round((moved / total) * 100);
  } else {
    const ratio = direction === 'above'
      ? (targetValue > 0 ? currentValue / targetValue : 0)
      : (currentValue > 0 ? targetValue / currentValue : 0);
    progress = Math.round(ratio * 90);
  }

  return { achieved: false, progress: Math.max(0, Math.min(99, progress)) };
}

module.exports = { matchReadings, computeGoalProgress };
