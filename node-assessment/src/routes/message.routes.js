const express = require('express');
const { createScheduledMessage } = require('../controllers/message.controller');

const router = express.Router();

// POST /api/messages  { message, day, time }
router.post('/', createScheduledMessage);

module.exports = router;
