const { Schema, model } = require('mongoose');

// Task 2.2 - the message is only ever written here once its scheduled
// day/time has actually arrived (see src/services/scheduler.js).
const messageSchema = new Schema(
  {
    text: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    insertedAt: { type: Date, default: Date.now }
  },
  { collection: 'messages' }
);

module.exports = model('Message', messageSchema);
