const dotenv = require('dotenv');

dotenv.config();

const requiredEnvKeys = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  // CORS_ORIGIN is intentionally NOT required: the Render deployment serves the
  // frontend and API from a single origin, and same-origin requests need no CORS
  // configuration. Set it only to allow additional third-party origins; the
  // wildcard origin ('*') is still rejected below.
];

const insecureJWTSecrets = new Set([
  'dev-secret-change-me',
  'secret',
  'changeme',
  'example',
  'your_jwt_secret',
]);

function validateEnv(env = process.env) {
  const issues = [];

  const requiredKeys = [...requiredEnvKeys];
  if (String(env.NODE_ENV || '').trim().toLowerCase() === 'production') {
    requiredKeys.push('DB_PASSWORD');
  }

  for (const key of requiredKeys) {
    const value = env[key];
    if (!value || String(value).trim() === '') {
      issues.push(key);
    }
  }

  const jwtSecret = env.JWT_SECRET;
  if (jwtSecret && insecureJWTSecrets.has(String(jwtSecret).trim().toLowerCase())) {
    issues.push('JWT_SECRET');
  }

  if (jwtSecret && String(jwtSecret).trim().length < 32) {
    issues.push('JWT_SECRET');
  }

  // Never allow an unrestricted wildcard CORS policy, even when explicitly configured.
  const corsOrigin = String(env.CORS_ORIGIN || '');
  if (corsOrigin.split(',').some((entry) => entry.trim() === '*')) {
    issues.push('CORS_ORIGIN');
  }

  return issues;
}

module.exports = {
  validateEnv,
  requiredEnvKeys,
};
