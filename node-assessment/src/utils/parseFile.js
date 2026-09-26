const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const XLSX = require('xlsx');

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // defval keeps missing cells as '' instead of being dropped, so every row
  // has a consistent shape (same behaviour as csv-parser).
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/**
 * Parses a .csv or .xlsx/.xls file into an array of plain row objects keyed
 * by the sheet's header names.
 */
async function parseDataFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return parseCSV(filePath);
  if (ext === '.xlsx' || ext === '.xls') return parseXLSX(filePath);
  throw new Error(`Unsupported file type "${ext}". Only .csv and .xlsx/.xls are supported.`);
}

module.exports = { parseDataFile };
