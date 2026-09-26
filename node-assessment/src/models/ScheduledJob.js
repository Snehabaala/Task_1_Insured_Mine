const { Schema, model } = require('mongoose');

// Bookkeeping queue for Task 2.2. This is intentionally a *separate*
// collection from Message: the job record (message text + when it's due)
// has to be persisted the moment the API call is accepted so a server
// restart doesn't lose it, but the spec asks for the message itself to be
// "inserted into DB at that particular day and time" - i.e. the Message
// document (see Message.js) shouldn't exist until it's actually due.
const scheduledJobSchema = new Schema(
  {
    message: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    completedAt: { type: Date }
  },
  { timestamps: true, collection: 'scheduled_jobs' }
);

scheduledJobSchema.index({ status: 1, scheduledAt: 1 });

module.exports = model('ScheduledJob', scheduledJobSchema);
