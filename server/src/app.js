require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const { clerk } = require('./middleware/authMiddleware');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// ── Security headers (HIPAA §164.312(e)) ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

// ── HTTPS enforcement in production ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General request handling ──────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(clerk);

// ── General rate limiter on all /api routes ───────────────────────────────────
app.use('/api', generalLimiter);

// ── Remove fingerprinting headers ─────────────────────────────────────────────
app.disable('x-powered-by');

// ── Health check (no auth / no audit needed) ──────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MedDoc AI server is running' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/documents',  require('./routes/documentRoutes'));
app.use('/api/chat',       require('./routes/chatRoutes'));
app.use('/api/metrics',    require('./routes/metricRoutes'));
app.use('/api/summary',    require('./routes/summaryRoutes'));
app.use('/api/dashboard',   require('./routes/dashboardRoutes'));
app.use('/api/goals',       require('./routes/goalRoutes'));
app.use('/api/medications', require('./routes/medicationRoutes'));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Never leak stack traces to the client
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal Server Error',
  });
});

module.exports = app;
