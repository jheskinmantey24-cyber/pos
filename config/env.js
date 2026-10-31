const dotenv = require('dotenv');

dotenv.config();

const requiredEnvKeys = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'CORS_ORIGIN',
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

  return issues;
}

module.exports = {
  validateEnv,
  requiredEnvKeys,
};
