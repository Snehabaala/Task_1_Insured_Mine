const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');
const Message = require('../models/Message');

const timers = new Map(); // jobId (string) -> setTimeout handle
const MAX_SETTIMEOUT_DELAY = 2 ** 31 - 1; // node's setTimeout ceiling, ~24.8 days

async function deliverJob(job) {
  const id = String(job._id);
  try {
    await Message.create({ text: job.message, scheduledFor: job.scheduledAt });
    await ScheduledJob.findByIdAndUpdate(job._id, { status: 'completed', completedAt: new Date() });
    console.log(`[scheduler] delivered job ${id} at ${new Date().toISOString()}`);
  } catch (err) {
    await ScheduledJob.findByIdAndUpdate(job._id, { status: 'failed' }).catch(() => {});
    console.error(`[scheduler] failed to deliver job ${id}:`, err.message);
  } finally {
    timers.delete(id);
  }
}

/**
 * Arms an exact-time delivery for a job. Safe to call more than once for the
 * same job (e.g. once from the controller, again from the reconciliation
 * cron) - it's a no-op if a timer is already armed.
 */
function scheduleMessage(job) {
  const id = String(job._id);
  if (timers.has(id)) return;

  const delay = job.scheduledAt.getTime() - Date.now();

  if (delay <= 0) {
    deliverJob(job);
    return;
  }

  if (delay <= MAX_SETTIMEOUT_DELAY) {
    const handle = setTimeout(() => deliverJob(job), delay);
    timers.set(id, handle);
  }
  // Jobs further out than MAX_SETTIMEOUT_DELAY are simply left "pending" -
  // the reconciliation cron below will arm them once they're in range.
}

// Runs every minute and re-arms any pending job that's due within the next
// minute. This is what makes the scheduler resilient to server restarts
// (including the ones Task 2.1's CPU monitor triggers) and to jobs that were
// originally too far out for setTimeout.
function startReconciliationCron() {
  cron.schedule('* * * * *', async () => {
    const dueSoon = new Date(Date.now() + 60 * 1000);
    const jobs = await ScheduledJob.find({ status: 'pending', scheduledAt: { $lte: dueSoon } });
    jobs.forEach(scheduleMessage);
  });
  console.log('[scheduler] reconciliation cron started (runs every minute)');
}

// Called once at boot to re-arm any jobs left pending from before a restart.
async function rehydratePendingJobs() {
  const pending = await ScheduledJob.find({ status: 'pending' });
  pending.forEach(scheduleMessage);
  console.log(`[scheduler] rehydrated ${pending.length} pending job(s) from DB`);
}

module.exports = { scheduleMessage, startReconciliationCron, rehydratePendingJobs };
