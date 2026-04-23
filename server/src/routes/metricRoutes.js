const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMetrics, getCriticalAlerts } = require('../controllers/metricController');

router.use(requireAuth);

router.get('/',        getMetrics);
router.get('/critical', getCriticalAlerts);

module.exports = router;
