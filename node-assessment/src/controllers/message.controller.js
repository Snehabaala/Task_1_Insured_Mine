const ScheduledJob = require('../models/ScheduledJob');
const { scheduleMessage } = require('../services/scheduler');

// POST /api/messages   body: { message, day, time }
// day: "YYYY-MM-DD"   time: "HH:mm" (24hr)
async function createScheduledMessage(req, res) {
  const { message, day, time } = req.body;

  if (!message || !day || !time) {
    return res.status(400).json({
      success: false,
      message: 'Fields "message", "day" (YYYY-MM-DD) and "time" (HH:mm, 24hr) are all required.'
    });
  }

  const scheduledAt = new Date(`${day}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid day/time format.' });
  }

  try {
    const job = await ScheduledJob.create({ message, scheduledAt });
    scheduleMessage(job);
    return res.status(201).json({
      success: true,
      message: `Accepted. Will be inserted into the "messages" collection at ${scheduledAt.toISOString()}.`,
      jobId: job._id,
      scheduledAt
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { createScheduledMessage };
