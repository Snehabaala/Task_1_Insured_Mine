const express = require('express');
const upload = require('../middleware/upload.middleware');
const { uploadDataFile } = require('../controllers/upload.controller');

const router = express.Router();

// POST /api/upload  (multipart/form-data, field name: "file")
router.post('/upload', upload.single('file'), uploadDataFile);

module.exports = router;
