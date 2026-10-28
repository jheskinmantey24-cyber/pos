const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('../config/env');

function buildBackupFilename(databaseName, date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');

  return `${(databaseName || 'jeskin_pos').replace(/[^a-zA-Z0-9_-]+/g, '-')}-${timestamp}.sql`;
}

function resolveMysqlDumpExecutable() {
  const candidates = [
    ...((process.env.PATH || '').split(path.delimiter).filter(Boolean).map((entry) => path.join(entry, 'mysqldump.exe'))),
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || 'mysqldump';
}

function buildMysqldumpArgs(config = process.env) {
  const args = [
    '--host', config.DB_HOST || 'localhost',
    '--user', config.DB_USER || 'root',
  ];

  if (config.DB_PASSWORD && String(config.DB_PASSWORD).trim() !== '') {
    args.push('--password', config.DB_PASSWORD);
  }

  args.push(config.DB_NAME || 'jeskin_pos');
  return args;
}

function createDatabaseBackup(config = process.env, outDir = path.join(__dirname, '..', 'backups')) {
  const targetDir = path.resolve(outDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const fileName = buildBackupFilename(config.DB_NAME || 'jeskin_pos');
  const filePath = path.join(targetDir, fileName);
  const args = buildMysqldumpArgs(config);
  const dumpBinary = resolveMysqlDumpExecutable();

  const result = spawnSync(dumpBinary, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      MYSQL_PWD: config.DB_PASSWORD || '',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const errorText = (result.stderr || '').trim() || 'Database backup failed.';
    throw new Error(errorText);
  }

  fs.writeFileSync(filePath, result.stdout || '');

  return filePath;
}

if (require.main === module) {
  try {
    const backupPath = createDatabaseBackup(process.env);
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error('Database backup failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  buildBackupFilename,
  buildMysqldumpArgs,
  createDatabaseBackup,
};
