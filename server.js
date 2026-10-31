const { validateEnv } = require('./config/env');

// Validate the environment BEFORE loading the app or the database layer, so a
// misconfigured deployment exits with one grouped, human-readable error instead
// of a require-time exception from deep inside config/db.js.
function exitWithStartupError(message) {
  console.error(message);
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3000);

const envIssues = validateEnv();
if (envIssues.length) {
  exitWithStartupError(
    'Missing or invalid required environment variables: ' +
      envIssues.join(', ') +
      '\nUpdate your .env file (locally) or the service environment settings (Render) before starting JESKIN POS.'
  );
}

const app = require('./app');
const db = require('./config/db');

async function start() {
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

  // Bind 0.0.0.0 explicitly: Render routes traffic to the container's
  // network interface on the port exposed via the PORT env variable.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JESKIN POS server listening on port ${PORT}`);
  });
}

start();
