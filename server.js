const app = require('./app');
const { validateEnv } = require('./config/env');

const PORT = Number(process.env.PORT || 3000);

const envIssues = validateEnv();
if (envIssues.length) {
  console.error('Missing required environment variables:', envIssues.join(', '));
  console.error('Please update your .env file before starting JESKIN POS.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`JESKIN POS server running on http://localhost:${PORT}`);
});
