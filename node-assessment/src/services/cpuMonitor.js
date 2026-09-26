const os = require('os');

const CHECK_INTERVAL_MS = Number(process.env.CPU_CHECK_INTERVAL_MS) || 5000;
const CPU_THRESHOLD = Number(process.env.CPU_THRESHOLD_PERCENT) || 70;

// os.cpus() returns cumulative tick counters since boot, so a single reading
// is useless for "current" usage - we snapshot twice and diff to get the
// utilization over just the interval between samples.
function snapshotCpuTimes() {
  return os.cpus().reduce(
    (acc, core) => {
      acc.idle += core.times.idle;
      acc.total += Object.values(core.times).reduce((s, t) => s + t, 0);
      return acc;
    },
    { idle: 0, total: 0 }
  );
}

function usagePercentBetween(start, end) {
  const idleDelta = end.idle - start.idle;
  const totalDelta = end.total - start.total;
  if (totalDelta <= 0) return 0;
  return 100 * (1 - idleDelta / totalDelta);
}

/**
 * Polls CPU usage every CHECK_INTERVAL_MS. When usage hits CPU_THRESHOLD
 * (default 70%), calls onThresholdExceeded (or gracefulRestart by default).
 */
function startCpuMonitor({ onThresholdExceeded } = {}) {
  let previous = snapshotCpuTimes();

  const timer = setInterval(() => {
    const current = snapshotCpuTimes();
    const usage = usagePercentBetween(previous, current);
    previous = current;

    console.log(`[cpu-monitor] usage: ${usage.toFixed(1)}%`);

    if (usage >= CPU_THRESHOLD) {
      console.warn(`[cpu-monitor] usage ${usage.toFixed(1)}% >= ${CPU_THRESHOLD}% threshold - restarting`);
      clearInterval(timer);
      if (typeof onThresholdExceeded === 'function') {
        onThresholdExceeded(usage);
      } else {
        gracefulRestart();
      }
    }
  }, CHECK_INTERVAL_MS);

  timer.unref(); // don't keep the event loop alive purely for monitoring
  return timer;
}

// Exits the process cleanly so a process manager (pm2/nodemon/systemd/Docker)
// restarts it. We deliberately exit rather than try to "reset" state in
// place, since that's the only way to guarantee no leaked handles/listeners
// survive into the next run - see ecosystem.config.js / README for the pm2
// autorestart wiring that actually performs the restart.
function gracefulRestart(server) {
  console.warn('[cpu-monitor] initiating graceful restart...');
  if (server && typeof server.close === 'function') {
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref(); // force-exit if close() hangs
  } else {
    process.exit(1);
  }
}

module.exports = { startCpuMonitor, gracefulRestart, usagePercentBetween, snapshotCpuTimes };
