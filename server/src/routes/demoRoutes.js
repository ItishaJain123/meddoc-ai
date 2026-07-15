const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { heavyLimiter } = require('../middleware/rateLimiter');
const { seedDemoData, clearDemoData } = require('../controllers/demoController');

router.use(requireAuth);

router.post('/seed', heavyLimiter, seedDemoData);
router.delete('/', clearDemoData);

module.exports = router;
