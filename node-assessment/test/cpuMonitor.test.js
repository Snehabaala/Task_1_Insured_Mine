const test = require('node:test');
const assert = require('node:assert/strict');
const { usagePercentBetween } = require('../src/services/cpuMonitor');

test('0% usage when the CPU was fully idle for the whole interval', () => {
  const start = { idle: 1000, total: 2000 };
  const end = { idle: 1500, total: 2500 }; // idleDelta === totalDelta
  assert.equal(usagePercentBetween(start, end), 0);
});

test('100% usage when the CPU was never idle during the interval', () => {
  const start = { idle: 1000, total: 2000 };
  const end = { idle: 1000, total: 2500 }; // idleDelta === 0
  assert.equal(usagePercentBetween(start, end), 100);
});

test('70% usage crosses the default restart threshold', () => {
  const start = { idle: 0, total: 0 };
  const end = { idle: 30, total: 100 }; // 30% idle -> 70% busy
  assert.equal(usagePercentBetween(start, end), 70);
});

test('returns 0 instead of dividing by zero when no time has elapsed', () => {
  const snap = { idle: 500, total: 1000 };
  assert.equal(usagePercentBetween(snap, snap), 0);
});
