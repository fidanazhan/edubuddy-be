const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the sender
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the receiver
    amount: { type: Number, required: true },
    senderBefore: { type: Number, required: true },
    receiverBefore: { type: Number, required: true },
    senderAfter: { type: Number, required: true },
    receiverAfter: { type: Number, required: true },
}, { timestamps: true });

transactionSchema.index({ sender: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);