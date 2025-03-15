const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    history: [
      {
        role: {
          type: String,
          enum: ["user", "model"],
          required: true,
        },
        parts: [
          {
            text: {
              type: String,
              required: true,
            },
          },
        ],
        img: {
          type: String,
          required: false,
        },
        tokens: {
          type: Number,  // Stores token count for this message
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
