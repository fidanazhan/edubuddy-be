const express = require("express");
const suggestionQuestionRouter = express.Router();
const SuggestionQuestion = require("../models/SuggestionQuestion");
const authMiddleware = require('../middleware/authMiddleware');
const tenantIdentifier = require('../middleware/tenantIdentifier')

// Add a new question
suggestionQuestionRouter.post("/", authMiddleware, async (req, res) => {
  
  try {
    const { question } = req.body;

    const tenantId = req.tenantId
    if (!tenantId) {
      return res.status(404).json({ error: 'Please include tenant on header' });
  }

    if (!question) return res.status(400).json({ message: "Question is required" });

    const newQuestion = new SuggestionQuestion({ question, tenantId, createdBy: req.decodedJWT.id});
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: "Error adding question : " + error });
  }
});

// Get all questions by tenantId
suggestionQuestionRouter.get("/", authMiddleware, async (req, res) => {
  
  try {
    const tenantId = req.tenantId

    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }

    const questions = await SuggestionQuestion.find({ tenantId })
      .select("question createdBy")  
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 });
    
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching questions: " + error });
  }
});


// Delete a question
suggestionQuestionRouter.delete("/:questionId", authMiddleware, async (req, res) => {
  try {

    const { questionId } = req.params;
    const tenantId = req.tenantId;

    // Ensure the group exists and belongs to the correct tenant
    const question = await SuggestionQuestion.findOne({ _id: questionId, tenantId });

    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    await SuggestionQuestion.deleteOne({ _id: questionId });

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting question : " + error });
  }
});

module.exports = suggestionQuestionRouter;
