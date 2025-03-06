const express = require('express');
const Config = require('../models/Config');
const SuggestionQuestion = require('../models/SuggestionQuestion');
const configRoute = express.Router();
const tenantIdentifier = require("../middleware/tenantIdentifier")
const authMiddleware = require("../middleware/authMiddleware")
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const googleStorage = new Storage({
    keyFilename: process.env.GOOGLE_CLOUD_KEYFILE, // Path to your service account JSON
    projectId: process.env.GOOGLE_CLOUD_PROJECT,  // Your Google Cloud Project ID
});
  
const bucket = googleStorage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

// Helper function to handle file uploads to Google Cloud Storage
const uploadToCloudStorage = async (file, tenantId, pictureType) => {
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const filePath = `${tenantId}/config/${pictureType}/${uniqueFileName}`;
    const gcsFile = bucket.file(filePath);

    // Upload file to Google Cloud Storage
    await gcsFile.save(file.buffer, {
        metadata: { contentType: file.mimetype },
    });

    // Make the file public
    await gcsFile.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    return {
        originalName: file.originalname,
        storedName: filePath,
        url: publicUrl,
        type: file.mimetype,
        size: file.size,
    };
};

// Create a new Config
configRoute.post('/', tenantIdentifier, async (req, res) => {
    try {
        console.log("Creating Config")
        const requestData = req.body || {};
        // const subdomain = req.headers['x-tenant'];
        // const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
        // if (!tenant) {
        //     return res.status(404).json({ error: 'Tenant not found' });
        // }

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
configRoute.get('/tenant', tenantIdentifier, async (req, res) => {
    // console.log("Attempting to get config")
    try {
        const tenantId = req.tenantId;
        const config = await Config.findOne({ tenantId }, '-img');
        if (!config) return res.status(404).json({ error: 'Configuration not found' });
        // console.log(config.config)
        res.status(200).json(config.config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Config by tenantID
configRoute.get('/theme', tenantIdentifier, async (req, res) => {
    // console.log("Attempting to get config")
    try {
        const tenantId = req.tenantId;
        console.log(tenantId)
        const config = await Config.findOne({ tenantId }, '-config');
        if (!config) return res.status(404).json({ error: 'Configuration not found' });
        // console.log(config.img)
        res.status(200).json(config.img);
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

// Upload Suggestion Question
configRoute.post("/", async (req, res) => {
    try {
        const { question, tenantId } = req.body;
        if (!question || !tenantId) {
        return res.status(400).json({ message: "Question and tenantId are required" });
        }

        const newQuestion = new SuggestionQuestion({ question, tenantId });
        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(500).json({ message: "Error adding question", error });
    }
});




// Upload login logo
configRoute.post("/upload/login-logo", authMiddleware, upload.single("file"), async (req, res) => {
    const tenantId = req.tenantId; // Get tenant ID from the decoded JWT

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    try {
        // Find the existing login logo URL in the database
        const existingConfig = await Config.findOne({ tenantId });
        const previousLogoUrl = existingConfig?.img?.loginLogoUrl;

        // Delete previous image from Google Cloud Storage
        if (previousLogoUrl) {
            // Extract file path from URL
            const filePath = previousLogoUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
            const gcsFile = bucket.file(filePath);

            // Delete the file
            await gcsFile.delete().catch((err) => {
                console.error("Error deleting previous image:", err.message);
            });
        }

        // Call the uploadToCloudStorage function
        const uploadResult = await uploadToCloudStorage(req.file, tenantId, "login-logo");

        // Update the configSchema with the new logo URL
        await Config.findOneAndUpdate(
            { tenantId },
            { $set: { "img.loginLogoUrl": uploadResult.url } },
            { new: true }
        );

        res.status(201).json({
            message: "Login logo uploaded successfully",
            logoUrl: uploadResult.url,
        });
    } catch (error) {
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
});


  
// Similar routes for banner.
configRoute.post("/upload/banner", authMiddleware, upload.single("file"), async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.decodedJWT.id;

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    try {
        // Find the existing banner URL in the database
        const existingConfig = await Config.findOne({ tenantId });
        const previousBannerUrl = existingConfig?.img?.bannerUrl;

        // Delete the previous banner image from Google Cloud Storage
        if (previousBannerUrl) {
            // Extract file path from URL
            const filePath = previousBannerUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
            const gcsFile = bucket.file(filePath);

            // Delete the file
            await gcsFile.delete().catch((err) => {
                console.error("Error deleting previous banner:", err.message);
            });
        }

        const uploadResult = await uploadToCloudStorage(req.file, tenantId, "banner");

        // Update the configSchema with the new banner URL
        await Config.findOneAndUpdate(
            { tenantId },
            { $set: { "img.bannerUrl": uploadResult.url } },
            { new: true }
        );

        res.status(201).json({
            message: "Banner uploaded successfully",
            bannerUrl: uploadResult.url,
        });
    } catch (error) {
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
});

// Add dashboard logo.
configRoute.post("/upload/dashboard-logo", authMiddleware, upload.single("file"), async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.decodedJWT.id;

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    try {
        // Find the existing dashboard logo URL in the database
        const existingConfig = await Config.findOne({ tenantId });
        const previousLogoUrl = existingConfig?.img?.dashboardLogoUrl;

        // Delete the previous dashboard logo image from Google Cloud Storage
        if (previousLogoUrl) {
            // Extract file path from URL
            const filePath = previousLogoUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
            const gcsFile = bucket.file(filePath);

            // Delete the file
            await gcsFile.delete().catch((err) => {
                console.error("Error deleting previous dashboard logo:", err.message);
            });
        }

        // Generate unique file name and path for the new dashboard logo
        const uploadResult = await uploadToCloudStorage(req.file, tenantId, "dashboard-logo");

        // Update the configSchema with the new dashboard logo URL
        await Config.findOneAndUpdate(
            { tenantId },
            { $set: { "img.dashboardLogoUrl": uploadResult.url } },
            { new: true }
        );

        res.status(201).json({
            message: "Dashboard logo uploaded successfully",
            dashboardLogoUrl: uploadResult.url,
        });
    } catch (error) {
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
});

// Delete login banner/logo
configRoute.delete("/delete/login-logo", authMiddleware, async (req, res) => {
    const tenantId = req.tenantId; // Get tenant ID from the decoded JWT

    try {
        // Retrieve the existing configuration for the tenant
        const existingConfig = await Config.findOne({ tenantId });
        const previousLogoUrl = existingConfig?.img?.loginLogoUrl;

        // If there's no login logo, respond with an error
        if (!previousLogoUrl) {
            return res.status(404).json({ message: "Login logo not found" });
        }

        // Extract file path from the URL
        const filePath = previousLogoUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
        const gcsFile = bucket.file(filePath);

        // Delete the file from Google Cloud Storage
        await gcsFile.delete();

        // Optionally, remove the URL from the database (if you want to clear it)
        await Config.findOneAndUpdate(
            { tenantId },
            { $unset: { "img.loginLogoUrl": "" } }, // Remove loginLogoUrl field from database
            { new: true }
        );

        res.status(200).json({
            message: "Login logo deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting login logo:", error.message);
        res.status(500).json({ message: "Failed to delete login logo", error: error.message });
    }
});

// DELETE: Delete banner
configRoute.delete("/delete/banner", authMiddleware, async (req, res) => {
    const tenantId = req.tenantId; // Get tenant ID from the decoded JWT

    try {
        // Retrieve the existing configuration for the tenant
        const existingConfig = await Config.findOne({ tenantId });
        const previousBannerUrl = existingConfig?.img?.bannerUrl;

        // If there's no banner, respond with an error
        if (!previousBannerUrl) {
            return res.status(404).json({ message: "Banner not found" });
        }

        // Extract file path from the URL
        const filePath = previousBannerUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
        const gcsFile = bucket.file(filePath);

        // Delete the file from Google Cloud Storage
        await gcsFile.delete();

        // Optionally, remove the URL from the database (if you want to clear it)
        await Config.findOneAndUpdate(
            { tenantId },
            { $unset: { "img.bannerUrl": "" } }, // Remove bannerUrl field from database
            { new: true }
        );

        res.status(200).json({
            message: "Banner deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting banner:", error.message);
        res.status(500).json({ message: "Failed to delete banner", error: error.message });
    }
});

// DELETE: Delete dashboard logo
configRoute.delete("/delete/dashboard-logo", authMiddleware, async (req, res) => {
    const tenantId = req.tenantId; // Get tenant ID from the decoded JWT

    try {
        // Retrieve the existing configuration for the tenant
        const existingConfig = await Config.findOne({ tenantId });
        const previousLogoUrl = existingConfig?.img?.dashboardLogoUrl;

        // If there's no dashboard logo, respond with an error
        if (!previousLogoUrl) {
            return res.status(404).json({ message: "Dashboard logo not found" });
        }

        // Extract file path from the URL
        const filePath = previousLogoUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, "");
        const gcsFile = bucket.file(filePath);

        // Delete the file from Google Cloud Storage
        await gcsFile.delete();

        // Optionally, remove the URL from the database (if you want to clear it)
        await Config.findOneAndUpdate(
            { tenantId },
            { $unset: { "img.dashboardLogoUrl": "" } }, // Remove dashboardLogoUrl field from database
            { new: true }
        );

        res.status(200).json({
            message: "Dashboard logo deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting dashboard logo:", error.message);
        res.status(500).json({ message: "Failed to delete dashboard logo", error: error.message });
    }
});

module.exports = configRoute;
