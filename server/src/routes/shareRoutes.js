const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/rateLimiter');
const { createShareLink, getSharedSummary } = require('../controllers/shareController');

// Public read endpoint — the token itself is the credential
router.get('/:token', generalLimiter, getSharedSummary);

// Creating a link requires auth
router.post('/', requireAuth, createShareLink);

module.exports = router;
