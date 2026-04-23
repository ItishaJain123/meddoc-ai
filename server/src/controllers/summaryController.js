const { generateHealthSummary } = require('../agents/summaryGenerator');

// GET /api/summary — generate and return health summary JSON
async function getSummary(req, res) {
  try {
    const summary = await generateHealthSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    if (err.message.includes('No processed documents')) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
}

module.exports = { getSummary };
