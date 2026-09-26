const fs = require('fs');
const { parseDataFile } = require('../utils/parseFile');
const { importRowsWithWorkers } = require('../workers/workerPool');

// POST /api/upload  (multipart/form-data, field name: "file")
async function uploadDataFile(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: 'No file uploaded. Use multipart/form-data field name "file".' });
  }

  const filePath = req.file.path;

  try {
    const rows = await parseDataFile(filePath);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'The uploaded file contains no data rows.' });
    }

    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/node_assessment';
    const summary = await importRowsWithWorkers(rows, mongoUri);

    return res.status(200).json({
      success: true,
      message: 'Import complete',
      totalRows: rows.length,
      ...summary
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    fs.unlink(filePath, () => {});
  }
}

module.exports = { uploadDataFile };
