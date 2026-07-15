const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { heavyLimiter } = require('../middleware/rateLimiter');
const { getMetrics, getCriticalAlerts, addManualMetric, compareNarrative } = require('../controllers/metricController');

router.use(requireAuth);

router.get('/',        getMetrics);
router.get('/critical', getCriticalAlerts);
router.post('/manual',  addManualMetric);
router.post('/compare-narrative', heavyLimiter, compareNarrative);

module.exports = router;
