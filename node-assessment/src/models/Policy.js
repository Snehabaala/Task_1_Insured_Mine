const { Schema, model } = require('mongoose');

// Collection 6: Policy Info
// Exactly the fields the spec calls out: policy number, start/end dates,
// plus references to the category (LOB), carrier, and user collections.
const policySchema = new Schema(
  {
    policyNumber: { type: String, required: true, trim: true, unique: true },
    policyStartDate: { type: Date },
    policyEndDate: { type: Date },
    lobId: { type: Schema.Types.ObjectId, ref: 'Lob', required: true },
    carrierId: { type: Schema.Types.ObjectId, ref: 'Carrier', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, collection: 'policies' }
);

policySchema.index({ userId: 1 });

module.exports = model('Policy', policySchema);
