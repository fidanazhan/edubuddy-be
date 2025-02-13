const express = require('express');
const Config = require('../models/Config');
const configRoute = express.Router();

// Create a new Config
configRoute.post('/', async (req, res) => {
    try {
        console.log("Creating Config")
        const requestData = req.body || {};
        // const subdomain = req.headers['x-tenant'];
        // const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
        // if (!tenant) {
        //     return res.status(404).json({ error: 'Tenant not found' });
        // }

        const newConfig = new Config({
            tenantId: req.tenantId,
            accessTokenTTL: requestData.accessTokenTTL ?? 15,
            refreshTokenTTL: requestData.refreshTokenTTL ?? 1440,
            maxFailedLoginAttempts: requestData.maxFailedLoginAttempts ?? 5,
            googleLogin: requestData.googleLogin ?? false,
            microsoftLogin: requestData.microsoftLogin ?? false,
        });
        const savedConfig = await newConfig.save();
        res.status(201).json(savedConfig);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// Get all Config
configRoute.get('/', async (req, res) => {
    try {
        const configs = await Config.find();
        res.status(200).json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Config by tenantID
configRoute.get('/tenant', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const config = await Config.findOne({ tenantId }, `-img`);
        if (!config) return res.status(404).json({ error: 'Configuration not found' });
        // console.log(config.config)
        res.status(200).json(config.config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Config by ID
configRoute.get('/:id', async (req, res) => {
    try {
        const config = await Config.findById(req.params.id);
        if (!config) return res.status(404).json({ error: 'Configuration not found' });
        res.status(200).json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Update a Config by ID
// Update or Create a Config by Tenant ID
configRoute.put('/', async (req, res) => {
    try {
        const requestData = req.body || {};
        const tenantId = req.tenantId;

        // Check if the config already exists
        const existConfig = await Config.findOne({ tenantId });

        if (!existConfig) {
            // Create a new config if it doesn't exist
            const newConfig = new Config({
                tenantId: tenantId,
                config: {
                    accessTokenTTL: requestData.accessTokenTTL ?? 15,
                    refreshTokenTTL: requestData.refreshTokenTTL ?? 1440,
                    maxFailedLoginAttempts: requestData.maxFailedLoginAttempts ?? 5,
                    googleLogin: requestData.googleLogin ?? false,
                    microsoftLogin: requestData.microsoftLogin ?? false,
                },
                img: {
                    loginLogoUrl: requestData.loginLogoUrl ?? "empty",
                    bannerUrl: requestData.bannerUrl ?? "empty",
                    dashboardLogoUrl: requestData.dashboardLogoUrl ?? "empty",
                },
            });
            const savedConfig = await newConfig.save();
            return res.status(201).json(savedConfig);
        } else {
            // Update the existing config
            const updatedConfig = await Config.findOneAndUpdate(
                { tenantId },
                {
                    $set: {
                        "config.accessTokenTTL": requestData.accessTokenTTL ?? existConfig.config.accessTokenTTL,
                        "config.refreshTokenTTL": requestData.refreshTokenTTL ?? existConfig.config.refreshTokenTTL,
                        "config.maxFailedLoginAttempts": requestData.maxFailedLoginAttempts ?? existConfig.config.maxFailedLoginAttempts,
                        "config.googleLogin": requestData.googleLogin ?? existConfig.config.googleLogin,
                        "config.microsoftLogin": requestData.microsoftLogin ?? existConfig.config.microsoftLogin,
                        "img.loginLogoUrl": requestData.loginLogoUrl ?? existConfig.img.loginLogoUrl,
                        "img.bannerUrl": requestData.bannerUrl ?? existConfig.img.bannerUrl,
                        "img.dashboardLogoUrl": requestData.dashboardLogoUrl ?? existConfig.img.dashboardLogoUrl,
                    },
                },

                { new: true, runValidators: true }
            );
            return res.status(200).json(updatedConfig);
        }
    } catch (err) {
        // Handle errors
        console.error('Error saving configuration:', err.message);
        res.status(400).json({ error: 'Failed to save configuration', details: err.message });
    }
});

// Delete a Config by ID
configRoute.delete('/:id', async (req, res) => {
    try {
        const deletedConfig = await Config.findByIdAndDelete(req.params.id);
        if (!deletedConfig) return res.status(404).json({ error: 'Configuration not found' });
        res.status(200).json({ message: 'Configuration deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = configRoute;
