const test = require('node:test');
const assert = require('node:assert/strict');

const { buildBackupFilename, buildMysqldumpArgs } = require('../scripts/backup-db');

test('buildBackupFilename creates a dated SQL file name', () => {
  const date = new Date('2026-10-28T12:34:56Z');
  const result = buildBackupFilename('jeskin_pos', date);

  assert.equal(result, 'jeskin_pos-20261028-123456.sql');
});

test('buildMysqldumpArgs includes all required database flags', () => {
  const args = buildMysqldumpArgs({
    DB_HOST: 'localhost',
    DB_USER: 'root',
    DB_PASSWORD: 'secret',
    DB_NAME: 'jeskin_pos',
  });

  assert.deepEqual(args, [
    '--host', 'localhost',
    '--user', 'root',
    '--password', 'secret',
    'jeskin_pos',
  ]);
});
