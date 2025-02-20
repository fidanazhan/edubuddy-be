const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who created the group
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Tenant reference
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient tenant-based queries
groupSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);
