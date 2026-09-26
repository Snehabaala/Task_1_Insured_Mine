const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseDataFile } = require('../src/utils/parseFile');

const SAMPLE_CSV = path.join(__dirname, '..', 'sample-data', 'policies-sample.csv');

const REQUIRED_COLUMNS = [
  'agent',
  'firstname',
  'dob',
  'address',
  'phone',
  'state',
  'zip',
  'email',
  'gender',
  'userType',
  'account_name',
  'category_name',
  'company_name',
  'policy_number',
  'policy_start_date',
  'policy_end_date'
];

test('parseDataFile parses the sample CSV into row objects', async () => {
  const rows = await parseDataFile(SAMPLE_CSV);
  assert.ok(Array.isArray(rows));
  assert.equal(rows.length, 1198, 'expected 1198 data rows in the sample sheet');
});

test('every parsed row exposes all fields the assignment asks for', async () => {
  const rows = await parseDataFile(SAMPLE_CSV);
  const first = rows[0];
  for (const col of REQUIRED_COLUMNS) {
    assert.ok(Object.prototype.hasOwnProperty.call(first, col), `missing column "${col}"`);
  }
});

test('rejects unsupported file extensions', async () => {
  await assert.rejects(() => parseDataFile('/tmp/whatever.txt'), /Unsupported file type/);
});
