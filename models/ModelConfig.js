const mongoose = require("mongoose");

const modelConfigSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    temperature: { type: Number, default: 0.7, required: true }, // Controls randomness
    // prePrompt: { type: String, default: "You are an AI assistant.", required: true }, // System prompt
    // maxInputTokens: { type: Number, default: 4096, required: true }, // Token limit for input
    maxOutputTokens: { type: Number, default: 1024, required: true }, // Token limit for output
    topP: { type: Number, default: 0.9, required: true }, // Controls diversity via nucleus sampling
    topK: { type: Number, default: 0.9, required: true }, // Controls diversity via nucleus sampling
    // frequencyPenalty: { type: Number, default: 0, required: true }, // Penalizes repeated phrases
    // presencePenalty: { type: Number, default: 0, required: true }, // Encourages topic diversity
    // stopSequences: { type: [String], default: [], required: true }, // Custom stop sequences
    // responseFormat: {
    //     type: String,
    //     enum: ["text", "json"],
    //     default: "text",
    //     required: true
    // }, // Format of AI response
}, { timestamps: true });

module.exports = mongoose.model("ModelConfig", modelConfigSchema);
