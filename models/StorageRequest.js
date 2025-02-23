const mongoose = require('mongoose');

const storageRequestSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the receiver
    amount: { type: Number, required: true },
    status: { type: Number, required: true, default: 0 }, // 0 - Pending, 1 - Approved, 2 - Rejected
    reason: { type: String },
}, { timestamps: true });

storageRequestSchema.index({ tenantId: 1 });

module.exports = mongoose.model('StorageRequest', storageRequestSchema);