const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Tenant' },
    defaultToken: { type: Number, default: 500 },
    defaultStorage: { type: Number, default: 500 },
});

module.exports = mongoose.model('Role', roleSchema);