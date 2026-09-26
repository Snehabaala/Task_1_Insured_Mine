const { Schema, model } = require('mongoose');

// Collection 3: User's Account
// Linked to the Agent who services it (a reasonable extension of the sheet's
// implicit "agent -> account -> user" relationship; see README "Data model"
// section for the full rationale).
const accountSchema = new Schema(
  {
    accountName: { type: String, required: true, trim: true },
    accountType: { type: String, trim: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', default: null }
  },
  { timestamps: true, collection: 'accounts' }
);

accountSchema.index({ accountName: 1, agentId: 1 }, { unique: true });

module.exports = model('Account', accountSchema);
