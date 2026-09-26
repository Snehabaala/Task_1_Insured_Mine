require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { startCpuMonitor, gracefulRestart } = require('./services/cpuMonitor');
const { startReconciliationCron, rehydratePendingJobs } = require('./services/scheduler');

const uploadRoutes = require('./routes/upload.routes');
const policyRoutes = require('./routes/policy.routes');
const messageRoutes = require('./routes/message.routes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', pid: process.pid, uptime: process.uptime() }));

app.use('/api', uploadRoutes); // POST /api/upload
app.use('/api/policies', policyRoutes); // GET /api/policies/search, /api/policies/aggregate
app.use('/api/messages', messageRoutes); // POST /api/messages

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  await rehydratePendingJobs(); // Task 2.2: re-arm any jobs pending from before a restart
  startReconciliationCron();

  const server = app.listen(PORT, () => console.log(`[server] listening on port ${PORT} (pid ${process.pid})`));

  // Task 2.1: watch CPU usage, restart the server once it hits the threshold
  startCpuMonitor({ onThresholdExceeded: () => gracefulRestart(server) });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
