const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { heavyLimiter } = require('../middleware/rateLimiter');
const { getSummary } = require('../controllers/summaryController');

router.use(requireAuth);

router.get('/', heavyLimiter, getSummary);

module.exports = router;
