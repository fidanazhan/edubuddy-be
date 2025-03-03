const mongoose = require("mongoose");

const suggestionQuestionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    question: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuggestionQuestion", suggestionQuestionSchema);
