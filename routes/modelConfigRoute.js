const express = require('express');
const ModelConfig = require('../models/ModelConfig')
const modelConfigRoute = express.Router();

// Create a new model Config
modelConfigRoute.post('/model', async (req, res) => {
    try {
        const newModelConfig = new modelConfig();
        const savedModelConfig = await newModelConfig.save();
        res.status(201).json(savedModelConfig);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// Get all model Config
modelConfigRoute.get('/', async (req, res) => {
    try {
        const modelConfigs = await ModelConfig.find();
        res.status(200).json(modelConfigs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Model Config by tenantID
modelConfigRoute.get('/tenant', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const modelConfig = await ModelConfig.findOne({ tenantId });
        if (!modelConfig) return res.status(404).json({ error: 'Model Configuration not found' });
        res.status(200).json(modelConfig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Model Config by ID
modelConfigRoute.get('/:id', async (req, res) => {
    try {
        const modelConfig = await modelConfig.findById(req.params.id);
        if (!modelConfig) return res.status(404).json({ error: 'Model Configuration not found' });
        res.status(200).json(modelConfig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a Model Config by ID
modelConfigRoute.put('/', async (req, res) => {
    try {
        const requestData = req.body || {};
        const tenantId = req.tenantId;
        // Check if the model config already exist  s
        const existModelConfig = await ModelConfig.findOne({ tenantId });

        if (!existModelConfig) {
            // Create a new model config if it doesn't exist
            const newModelConfig = new ModelConfig({
                tenantId: tenantId,
                temperature: requestData.temperature ?? 0.7,
                maxOutputTokens: requestData.maxOutputTokens ?? 1024,
                topP: requestData.topP ?? 0.9,
                topK: requestData.topK ?? 0.9,
            });
            const savedModelConfig = await newModelConfig.save();
            return res.status(201).json(savedModelConfig);
        } else {
            // Update the existing model config
            const updatedModelConfig = await ModelConfig.findOneAndUpdate(
                { tenantId },
                {
                    temperature: requestData.temperature ?? existModelConfig.accessTokenTTL,
                    maxOutputTokens: requestData.maxOutputTokens ?? existModelConfig.refreshTokenTTL,
                    topP: requestData.topP ?? existModelConfig.maxFailedLoginAttempts,
                    topK: requestData.topK ?? existModelConfig.googleLogin,
                },
                { new: true, runValidators: true }
            );
            return res.status(200).json(updatedModelConfig);
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a Model Config by ID
modelConfigRoute.delete('/:id', async (req, res) => {
    try {
        const deletedModelConfig = await ModelConfig.findByIdAndDelete(req.params.id);
        if (!deletedModelConfig) return res.status(404).json({ error: 'Model Configuration not found' });
        res.status(200).json({ message: 'Model Configuration deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = modelConfigRoute;
