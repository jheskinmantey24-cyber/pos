const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./config/env');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware');

const app = express();

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

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS policy'));
  },
  credentials: true,
}));

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

const publicPages = [
  'login.html',
  'dashboard.html',
  'checkout.html',
  'products.html',
  'inventory.html',
  'sales.html',
  'reports.html',
  'users.html',
];

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiLimiter);
app.use('/api', routes);

publicPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', page));
  });
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
