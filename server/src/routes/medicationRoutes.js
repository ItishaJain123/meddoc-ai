const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMedications } = require('../controllers/medicationController');

router.use(requireAuth);
router.get('/', getMedications);

module.exports = router;
