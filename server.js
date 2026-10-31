const app = require('./app');
const { validateEnv } = require('./config/env');
const db = require('./config/db');

const PORT = Number(process.env.PORT || 3000);

function exitWithStartupError(message) {
  console.error(message);
  process.exit(1);
}

async function start() {
  const envIssues = validateEnv();
  if (envIssues.length) {
    exitWithStartupError(
      'Missing or invalid required environment variables: ' +
        envIssues.join(', ') +
        '\nUpdate your .env file (locally) or the service environment settings (Render) before starting JESKIN POS.'
    );
  }

  try {
    await db.checkConnection();
    console.log('Database connection verified.');
  } catch (error) {
    // Log only the error code - never connection details, users, or credentials.
    const detail = error && error.code ? ` (${error.code})` : '';
    exitWithStartupError(
      'Database connection failed. Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, and the Aiven CA certificate.' +
        detail
    );
  }

  app.listen(PORT, () => {
    console.log(`JESKIN POS server listening on port ${PORT}`);
  });
}

start();
