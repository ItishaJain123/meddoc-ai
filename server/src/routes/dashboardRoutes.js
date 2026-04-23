const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getDashboard } = require('../controllers/dashboardController');

router.use(requireAuth);
router.get('/', getDashboard);

module.exports = router;
