const mongoose = require('mongoose');

const groupUserSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Tenant reference
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GroupUser', groupUserSchema);