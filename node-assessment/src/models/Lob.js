const { Schema, model } = require('mongoose');

// Collection 4: Policy Category (Line of Business)
const lobSchema = new Schema(
  {
    categoryName: { type: String, required: true, trim: true, unique: true }
  },
  { timestamps: true, collection: 'lobs' }
);

module.exports = model('Lob', lobSchema);
