const mongoose = require('mongoose');

/**
 * Connects the default mongoose instance used by the Express process.
 * Worker threads (see src/workers/importWorker.js) open their own,
 * independent connections rather than sharing this one.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/node_assessment';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] connected -> ${uri}`);
  return mongoose.connection;
}

module.exports = { connectDB };
