const rateLimit = require('express-rate-limit');

const message = (action) => ({
  error: `Too many ${action} attempts. Please try again later.`,
});

// Upload: max 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: message('upload'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat: max 60 messages per hour
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: message('chat'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Summary/heavy AI endpoints: max 10 per hour
const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: message('generation'),
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: max 200 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: message('request'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { uploadLimiter, chatLimiter, heavyLimiter, generalLimiter };
