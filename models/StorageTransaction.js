const mongoose = require('mongoose');

const storageTransactionSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    sender: {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the sender
        senderName: { type: String, required: true }
    },
    receiver: {
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the receiver
        receiverName: { type: String, required: true }
    },
    amount: { type: Number, required: true },
    senderToken: {
        before: { type: Number, required: true },
        after: { type: Number, required: true },
    },
    receiverToken: {
        before: { type: Number, required: true },
        after: { type: Number, required: true },
    },
}, { timestamps: true });

storageTransactionSchema.index({ sender: 1 });

module.exports = mongoose.model('StorageTransaction', storageTransactionSchema);
