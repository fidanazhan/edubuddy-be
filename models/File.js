const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true }, 
    storedName: { type: String, required: true }, 
    url: { type: String, required: true },
    type: { type: String, required: true }, 
    size: { type: Number, required: true }, 
    tag: { type: String, default: "Untagged" }, 
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Tenant' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    createdAt: { type: Date, default: Date.now }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);
