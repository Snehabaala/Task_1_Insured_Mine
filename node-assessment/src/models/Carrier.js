const { Schema, model } = require('mongoose');

// Collection 5: Policy Carrier
const carrierSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true, unique: true }
  },
  { timestamps: true, collection: 'carriers' }
);

module.exports = model('Carrier', carrierSchema);
