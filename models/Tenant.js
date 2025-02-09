const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tenant's name or organization name
  subdomain: { type: String, required: true, unique: true }, // Subdomain associated with the tenant
  logoUrl: {type: String}, // String for logo URL
  createdAt: { type: Date, default: Date.now }, // Timestamp for user creation
  modifiedAt: { type: Date, default: Date.now }, // Timestamp for user modification
  createdBy: {type: String}, // String for user creation
  modifiedBy: {type: String} // String for user modification
});

module.exports = mongoose.model('Tenant', tenantSchema);
