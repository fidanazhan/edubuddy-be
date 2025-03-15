const express = require("express");
const Chat = require('../models/Chat.js');
const User = require('../models/User.js');
const UserChat = require("../models/UserChat.js");
const authMiddleware = require("../middleware/authMiddleware")
const gptTokenizer = require('gpt-tokenizer');

const chatRoute = express.Router();
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} = require("@google/generative-ai");

chatRoute.post("/", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  const { text } = req.body;
  console.log("1 Creating chat")
  // console.log(req.body)
  try {
    // Create new chat
    console.log("Inserting User Question")
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });
    // Save the new chat to the database
    const savedChat = await newChat.save();
    // Respond with the chatId in the response body

    // CHECK IF THE USERCHATS EXISTS
    const userChats = await UserChat.find({ userId: userId });

    // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
    if (!userChats.length) {
      const newUserChats = new UserChat({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
      await UserChat.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }

    res.status(201).send({ chatId: savedChat._id });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});

chatRoute.get("/userchats", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  console.log("3 Getting user's chats")
  try {
    const userChats = await UserChat.findOne({ userId });

    if (userChats) {
      // console.log(userChats.chats)
      userChats.chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // console.log(userChats)
    res.status(200).send(userChats.chats);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});

chatRoute.get("/:id", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  console.log("2 Get the chat based on id")
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });
    if (!chat) return res.status(404).send({ error: "Chat did not exist" });
    res.status(200).send(chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});


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
      // console.log(chunkText); // Log or process the chunk as needed

      // Write the chunk to the response immediately
      res.write(chunkText);
      res.flush?.(); // Ensure immediate flush if supported
    }

    // **Count Output Tokens**
    const outputTokens = gptTokenizer.encode(accumulatedText).length;
    console.log(`Output Tokens: ${outputTokens}`);

    // End the response once the streaming is complete
    res.end();
    return { response: accumulatedText, outputTokens }; // Optional: Return the final accumulated text if needed
  } catch (error) {
    console.error("Error creating model:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

chatRoute.put("/:id", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  const { imgdb, imgai } = req.body;
  const question = req.body.question
  console.log("question : " + question)
  try {
    if (!question) {
      return res.status(400).send("Question is required!");
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId });

    if (!chat) {
      return res.status(404).send("Chat not found!");
    }

    // **Estimate tokens for the user message**
    const userMessageTokens = gptTokenizer.encode(question).length;
    console.log("userMessageTokens: " + userMessageTokens)

    // Save the user message first
    const userMessage = {
      role: "user",
      parts: [{ text: question }],
      ...(imgdb && { imgdb }),
      tokens: userMessageTokens, // Store tokens
    };

    if (chat.history.length > 1) {
      console.log("Inserting User Question 2")
      await Chat.updateOne(
        { _id: req.params.id, userId },
        { $push: { history: userMessage } }
      );
    }

    // Capture the AI response
    let modelResponseText = "";
    let modelTokens = ""
    try {
      const result = await model_chat_answer(chat, "gemini-2.0-flash", question, imgai, res);
      modelResponseText = result.response;
      modelTokens = result.outputTokens;
    } catch (error) {
      console.error("Error calling model_chat_answer:", error);
      if (!res.headersSent) {
        return res.status(500).send("Error processing AI response");
      }
      return;
    }
    if (!modelResponseText || typeof modelResponseText !== "string") {
      console.warn("AI response is missing or invalid:", modelResponseText);
      modelResponseText = "No response from AI";
    }

    // Save the AI response
    const modelMessage = {
      role: "model",
      parts: [{ text: modelResponseText }],
      tokens: modelTokens, // Store AI token count
    };
    
    await Chat.updateOne(
      { _id: req.params.id, userId },
      { $push: { history: modelMessage } }
    );
    // console.log("AI response saved:", modelMessage);

    await UserChat.updateOne(
      { userId, "chats._id": req.params.id },
      { $set: { "chats.$.updatedAt": new Date() } }
    );

    await UserChat.updateOne(
      { userId },
      {
        $push: {
          chats: {
            $each: [], // Keep existing elements
            $sort: { updatedAt: -1 } // Sort by updatedAt (latest first)
          }
        }
      }
    );

    // **Calculate total tokens used**
    let totalToken = modelTokens + userMessageTokens;

    // **Update User's totalToken (subtract used tokens)**
    await User.updateOne(
      { _id: userId },
      { $inc: { totalToken: -totalToken } } // Subtract totalToken from user.totalToken
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    if (!res.headersSent) {
      res.status(500).send("Error updating chat!");
    }
  }
});

chatRoute.delete("/:id", authMiddleware, async (req, res) => {
  const userId = req.decodedJWT.id;
  const chatId = req.params.id;
  console.log("5 Delete chat")
  // console.log(chatId)
  try {
    // Delete chat from the Chat collection
    const deletedChat = await Chat.deleteOne({ _id: chatId, userId });
    // Remove chat reference from UserChat
    const updatedUserChat = await UserChat.findOneAndUpdate(
      { userId }, // Correct filter to match the user
      { $pull: { chats: { _id: chatId } } } // Correctly remove the chat from array
    );
    console.log("Chat deleted");
    // console.log(updatedUserChat)
    res.status(200).send(updatedUserChat.chats);
  } catch (err) {
    console.error("Unexpected error:", err);
    if (!res.headersSent) {
      res.status(500).send("Error deleting chat!");
    }
  }
});


module.exports = chatRoute;
