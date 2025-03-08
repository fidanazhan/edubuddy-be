const express = require("express");
const Chat = require('../models/Chat.js'); 
const UserChat = require ("../models/UserChat.js");
const authMiddleware = require("../middleware/authMiddleware")

const chatRoute = express.Router();
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} = require("@google/generative-ai");

const safetySetting = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

const model_chat_answer = async (data, modelChosen, text, imgai, res) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySetting,
    });

    const chat = model.startChat({
      history: data?.history?.map(({ role, parts }) => {
        if (role && parts?.[0]?.text) {
          return {
            role,
            parts: [{ text: parts[0].text }],
          };
        }
        return null; // Skip invalid entries
      }).filter(Boolean), // Remove invalid entries
      generationConfig: {
        // maxOutputTokens: 100,
      },
    });

    let accumulatedText = "";

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Stream data as it's received from the AI model
    const result = await chat.sendMessageStream([text]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedText += chunkText;
      console.log(chunkText); // Log or process the chunk as needed

      // Write the chunk to the response immediately
      res.write(chunkText);
      res.flush?.(); // Ensure immediate flush if supported
    }

    // End the response once the streaming is complete
    res.end();
    return accumulatedText; // Optional: Return the final accumulated text if needed
  } catch (error) {
    console.error("Error creating model:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

chatRoute.put("/:id", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  const { question, imgdb, imgai } = req.body;

  try {
    if (!question) {
      return res.status(400).send("Question is required!");
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId });

    if (!chat) {
      return res.status(404).send("Chat not found!");
    }

    // Save the user message first
    const userMessage = {
      role: "user",
      parts: [{ text: question }],
      ...(imgdb && { imgdb }),
    };

    await Chat.updateOne(
      { _id: req.params.id, userId },
      { $push: { history: userMessage } }
    );

    console.log("User message saved:", userMessage);

    // Capture the AI response
    let modelResponseText = "";
    try {
      modelResponseText = await model_chat_answer(chat, "gemini-2.0-flash", question, imgai, res);
    } catch (error) {
      console.error("Error calling model_chat_answer:", error);
      if (!res.headersSent) {
        return res.status(500).send("Error processing AI response");
      }
      return;
    }

    // Ensure we got an actual response from the model
    if (!modelResponseText || typeof modelResponseText !== "string") {
      console.warn("AI response is missing or invalid:", modelResponseText);
      modelResponseText = "No response from AI";
    }

    // Save the AI response
    const modelMessage = {
      role: "model",
      parts: [{ text: modelResponseText }],
    };

    await Chat.updateOne(
      { _id: req.params.id, userId },
      { $push: { history: modelMessage } }
    );

    console.log("AI response saved:", modelMessage);
  } catch (err) {
    console.error("Unexpected error:", err);

    if (!res.headersSent) {
      res.status(500).send("Error updating chat!");
    }
  }
});


// chatRoute.post("/", authMiddleware, async (req, res) => {
//   const userId = req.decodedJWT.id;
//   const { text } = req.body;

//   try {
//     // CREATE A NEW CHAT
//     const newChat = new Chat({
//       userId: userId,
//       history: [{ role: "user", parts: [{ text }] }],
//     });

//     const savedChat = await newChat.save();

//     // CHECK IF THE USERCHATS EXISTS
//     const userChats = await UserChat.find({ userId: userId });

//     // Streaming model answer
//     await model_chat_answer(savedChat, "gemini-2.0-flash", text, null, res);

//     // Optionally, save the chat with model response to the database after the stream
//     const modelResponse = "streaming result"; // This could be accumulated text or result
//     await Chat.updateOne(
//       { _id: savedChat._id, userId },
//       {
//         $push: {
//           history: {
//             role: "model",
//             parts: [{ text: modelResponse }],
//           },
//         },
//       }
//     );

//     // Update the UserChats if needed
//     if (!userChats.length) {
//       const newUserChats = new UserChat({
//         userId: userId,
//         chats: [
//           {
//             _id: savedChat._id,
//             title: text.substring(0, 40),
//           },
//         ],
//       });

//       await newUserChats.save();
//     } else {
//       await UserChat.updateOne(
//         { userId: userId },
//         {
//           $push: {
//             chats: {
//               _id: savedChat._id,
//               title: text.substring(0, 40),
//             },
//           },
//         }
//       );
//     }

//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error creating chat!");
//   }
// });


chatRoute.post("/", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  const { text } = req.body;

  try {
    // Create new chat
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    // Save the new chat to the database
    const savedChat = await newChat.save();

    // Respond with the chatId in the response body
    res.status(201).send({ chatId: savedChat._id });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});


chatRoute.get("/userchats", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;

  try {
    const userChats = await UserChat.find({ userId });

    res.status(200).send(userChats[0].chats);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});


chatRoute.get("/:id", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;

  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });

    res.status(200).send(chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

const model_chat_answer2 = async (data, modelChosen, text, imgai, res) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_PUBLIC_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySetting,
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: SchemaType.OBJECT,
      },
    });
    // console.log(data)
    const chat = model.startChat({
      history: data?.history?.map(({ role, parts }) => {
        if (role && parts?.[0]?.text) {
          return {
            role,
            parts: [{ text: parts[0].text }],
          };
        }
        return null; // Skip invalid entries
      }).filter(Boolean), // Remove invalid entries
      generationConfig: {
        // maxOutputTokens: 100,
      },
    });
    // let accumulatedText = "";

    try {
      const result = await chat.sendMessage(
        [text]
      );
      return result;
    } catch (err) {
      console.log(err);
    }
    return "ERROR";
  } catch (error) {
    console.error("Error creating model:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

module.exports = chatRoute;
