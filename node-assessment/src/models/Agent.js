const { Schema, model } = require('mongoose');

// Collection 1: Agent
const agentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }
  },
  { timestamps: true, collection: 'agents' }
);

module.exports = model('Agent', agentSchema);
