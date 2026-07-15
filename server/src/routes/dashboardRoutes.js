const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getDashboard } = require('../controllers/dashboardController');
const { getTimeline } = require('../controllers/timelineController');

router.use(requireAuth);
router.get('/', getDashboard);
router.get('/timeline', getTimeline);

module.exports = router;
