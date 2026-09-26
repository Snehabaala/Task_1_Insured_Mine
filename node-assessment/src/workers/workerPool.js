const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

const WORKER_PATH = path.join(__dirname, 'importWorker.js');

function chunkArray(arr, numChunks) {
  const chunks = Array.from({ length: numChunks }, () => []);
  arr.forEach((item, idx) => chunks[idx % numChunks].push(item));
  return chunks.filter((c) => c.length > 0);
}

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData });
    worker.on('message', (msg) => {
      if (msg.type === 'result') resolve(msg.payload);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Import worker stopped with exit code ${code}`));
    });
  });
}

/**
 * Splits `rows` across up to `maxWorkers` worker_threads (defaulting to
 * cores-1, capped at 4) and imports them into MongoDB in parallel.
 */
async function importRowsWithWorkers(rows, mongoUri, options = {}) {
  const envMax = Number(process.env.IMPORT_MAX_WORKERS);
  const maxWorkers = options.maxWorkers || envMax || Math.max(1, Math.min(os.cpus().length - 1, 4));
  const numWorkers = Math.min(maxWorkers, rows.length) || 1;
  const chunks = chunkArray(rows, numWorkers);

  console.log(`[import] dispatching ${rows.length} rows across ${chunks.length} worker thread(s)`);

  const results = await Promise.all(chunks.map((chunk) => runWorker({ rows: chunk, mongoUri })));

  return results.reduce(
    (acc, r) => ({
      processed: acc.processed + r.processed,
      inserted: acc.inserted + r.inserted,
      updated: acc.updated + r.updated,
      failed: acc.failed + r.failed,
      errors: acc.errors.concat(r.errors)
    }),
    { processed: 0, inserted: 0, updated: 0, failed: 0, errors: [] }
  );
}

module.exports = { importRowsWithWorkers, chunkArray };
