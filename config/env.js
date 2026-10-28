const dotenv = require('dotenv');

dotenv.config();

const requiredEnvKeys = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];

function validateEnv(env = process.env) {
  const issues = requiredEnvKeys.filter((key) => {
    const value = env[key];
    return !value || String(value).trim() === '';
  });

  return issues;
}

module.exports = {
  validateEnv,
};
