const express = require('express');
const { searchPoliciesByUser, aggregatedPoliciesByUser } = require('../controllers/policy.controller');

const router = express.Router();

// GET /api/policies/search?username=...
router.get('/search', searchPoliciesByUser);

// GET /api/policies/aggregate
router.get('/aggregate', aggregatedPoliciesByUser);

module.exports = router;
