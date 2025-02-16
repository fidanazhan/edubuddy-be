const mongoose = require('mongoose');

// User Schema with tenantId as ObjectId
const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  modifiedBy: { type: String },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  refreshToken: { type: String },
  ICNumber: {type: Number },
  status: {type: Number}, // 0 - Not Active, 1 - Active, 2 - Suspend
  profilePictureUrl: {type: String},
  totalStorage: {type: Number},
  usedStorage: {type: Number},
  GoogleAccessToken: {type: String},
  GoogleRefreshToken: {type: String},
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
});

// Create indexes
userSchema.index({ tenantId: 1 }); 
userSchema.index({ role: 1 });

// Export the User model
module.exports = mongoose.model('User', userSchema);
