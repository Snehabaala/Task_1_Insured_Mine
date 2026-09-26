const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkArray } = require('../src/workers/workerPool');

test('splits rows evenly (round-robin) across the requested number of workers', () => {
  const rows = Array.from({ length: 10 }, (_, i) => i);
  const chunks = chunkArray(rows, 3);
  assert.equal(chunks.length, 3);
  assert.equal(chunks.reduce((n, c) => n + c.length, 0), 10);
});

test('never returns more chunks than there are rows', () => {
  const rows = [1, 2];
  const chunks = chunkArray(rows, 4);
  assert.equal(chunks.length, 2);
});

test('drops empty chunks when workers outnumber rows', () => {
  const rows = [1];
  const chunks = chunkArray(rows, 4);
  assert.deepEqual(chunks, [[1]]);
});
