const { Schema, model } = require('mongoose');

// Collection 2: User
const userSchema = new Schema(
  {
    firstname: { type: String, required: true, trim: true },
    dob: { type: Date },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    phone: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: { type: String, trim: true },
    userType: { type: String, trim: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null }
  },
  { timestamps: true, collection: 'users' }
);

// firstname+email uniquely identifies a person in this sheet (several
// different people can share a first name, so email disambiguates them).
userSchema.index({ firstname: 1, email: 1 }, { unique: true });

module.exports = model('User', userSchema);
