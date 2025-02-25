const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const chatRoute = express.Router();
const Chat = require("../models/Chat");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

chatRoute.post('/generate', async (req, res) => {
    const { prompt } = req.body;
  
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
  
    try {
      const result = await model.generateContent(prompt);
      // const responseText = await result.response.text();
  
      res.json({ result: result });
    } catch (error) {
      console.error('Error generating content:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }

    // const chat = model.startChat({
    //   history: [
    //     {
    //       role: "user",
    //       parts: [{ text: "Hello" }],
    //     },
    //     {
    //       role: "model",
    //       parts: [{ text: "Great to meet you. What would you like to know?" }],
    //     },
    //   ],
    // });
    
    // let result = await chat.sendMessage("I have 2 dogs in my house.");
    // console.log(result.response.candidates);
    // let result2 = await chat.sendMessage("How many paws are in my house?");
    // console.log(result2.response.text());
  });

// chatRoute.post("/generate", async (req, res) => {
//   const { userId, prompt } = req.body;

//   if (!userId || !prompt) {
//     return res.status(400).json({ error: "User ID and prompt are required" });
//   }

//   try {
//     // Generate response from the model
//     const result = await model.generateContent(prompt);
//     const responseText = await result.response.text();

//     // Create a new chat entry
//     const chatEntry = await Chat.findOneAndUpdate(
//       { userId }, // Find chat by userId
//       {
//         $push: {
//           history: {
//             role: "user",
//             parts: [{ text: prompt }],
//           },
//         },
//       },
//       { new: true, upsert: true }
//     );

//     // Add model response to chat history
//     const updatedChat = await Chat.findOneAndUpdate(
//       { userId },
//       {
//         $push: {
//           history: {
//             role: "model",
//             parts: [{ text: responseText }],
//           },
//         },
//       },
//       { new: true }
//     );

//     res.json({ success: true, chat: updatedChat });

//   } catch (error) {
//     console.error("Error generating content:", error);
//     res.status(500).json({ error: "Failed to generate content" });
//   }
// });

chatRoute.post('/generate-stream', async (req, res) => {
  const { prompt } = req.body;

  try {
      const result = await model.generateContentStream(prompt);
      let accumulatedText = '';

      for await (const chunk of result.stream) {
      const chunkText = await chunk.text();
      accumulatedText += chunkText;
      }

      const usageMetadata = result.usageMetadata(); // Access usage metadata

      res.json({
          response: accumulatedText,
          usage: usageMetadata,
      });
  } catch (error) {
      console.error('Error generating content:', error);
      res.status(500).json({ error: 'Failed to generate content' });
  }
});

module.exports = chatRoute;
