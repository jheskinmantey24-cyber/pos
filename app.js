const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./config/env');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware');

const app = express();

// Render terminates TLS behind one proxy layer. Trust the first hop so that
// req.ip (used by the rate limiter) reflects the real client address.
app.set('trust proxy', 1);

// The frontend folder. On Render the API and the UI share one service, so prefer
// a `frontend/` directory and fall back to the existing `public/` directory.
const FRONTEND_DIR = ['frontend', 'public']
  .map((dir) => path.join(__dirname, dir))
  .find((candidate) => fs.existsSync(candidate)) || path.join(__dirname, 'public');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://images.pexels.com'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
}));

// Optional extra origins (e.g. a second deployed copy of the UI), comma separated.
// The wildcard origin is never honoured; config/env.js rejects it at startup.
const extraAllowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin, req) {
  try {
    const originHost = new URL(origin).host;
    // Same service, same domain: this app serves both the frontend and the API,
    // so an origin whose host matches the request host is this app itself.
    if (originHost === req.headers.host) {
      return true;
    }
  } catch {
    return false;
  }
  return extraAllowedOrigins.includes(origin);
}

// Minimal, strict CORS for the single-service deployment. Requests without an
// Origin header (same-server health checks, curl, top-level navigation) are not
// cross-origin and pass through untouched. Same-host origins are always allowed;
// everything else must appear in CORS_ORIGIN.
function sameOriginCors(req, res, next) {
  const origin = req.headers.origin;

  if (origin) {
    if (!isAllowedOrigin(origin, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Origin not allowed by CORS policy',
      });
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

app.use(sameOriginCors);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(require('cookie-parser')());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});

// Static assets. Only the frontend folder is published; all private files
// (.env, ca.pem, backups/, mysql-data/, schema.sql) live outside it and can
// never be served. There is no index.html, so browsers hitting / fall through
// to the explicit route below.
app.use(express.static(FRONTEND_DIR));

// Mount the API: pages like /login.html cannot collide because every API
// endpoint lives under the /api prefix. Static files are served first, so
// an unknown URL still reaches the API 404 handler via /api only.
app.use('/api', apiLimiter);
app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
