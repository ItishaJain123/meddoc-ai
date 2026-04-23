const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getGoals, createGoal, deleteGoal, getAvailableMetrics } = require('../controllers/goalController');

router.use(requireAuth);
router.get('/',         getGoals);
router.get('/metrics',  getAvailableMetrics);
router.post('/',        createGoal);
router.delete('/:id',   deleteGoal);

module.exports = router;
