const express = require('express');
const Config = require('../models/Config');
const configRoute = express.Router();
const tenantIdentifier = require("../middleware/tenantIdentifier")
// BELOW

const File = require('../models/File')
const multer = require("multer");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const authMiddleware = require("../middleware/authMiddleware")

// Configure DigitalOcean Spaces with AWS SDK v3
const s3 = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT, // e.g., "https://sgp1.digitaloceanspaces.com"
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    region: process.env.DO_SPACES_REGION,
});

// Configure Multer for file uploads (without multer-s3)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ABOVE

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

configRoute.put('/upload',
    authMiddleware,
    upload.fields([
        { name: "banner", maxCount: 1 }, // Accept 1 file for 'banner'
        { name: "loginLogo", maxCount: 1 }, // Accept 1 file for 'loginLogo'
        { name: "dashboardLogo", maxCount: 1 }, // Accept 1 file for 'dashboardLogo'
    ]),
    async (req, res) => {
        console.log("Uploading Pictures into database.")

        try {
            const userId = req.user.id;
            const subdomain = req.headers['x-tenant'];
            const userEmail = req.user.email;
            const tenantId = req.tenantId;

            // Access uploaded files
            const loginLogoImage = req.files["loginLogo"][0]; // Access the 'loginLogo' image
            const bannerImage = req.files["banner"][0]; // Access the 'banner' image
            const dashboardLogoImage = req.files["dashboardLogo"][0]; // Access the 'dashboardLogo' image

            // const tags = Array.isArray(req.body.tag) ? req.body.tag : req.body.tag[0];
            // console.log(tags)

            const tags = [`loginLogo`, `banner`, `dashboardLogo`]
            console.log(tags)
            const tagUrl = {
                "loginLogo": "",
                "banner": "",
                "dashboardLogo": ""
            }

            const files = [loginLogoImage, bannerImage, dashboardLogoImage]

            // Process all files before saving
            const uploadedFiles = await Promise.all(
                files.map(async (file, index) => {
                    const uniqueFileName = `${Date.now()}-${file.originalname}`;
                    const filePath = `${tenantId}/${userEmail}/${uniqueFileName}`;

                    const uploadParams = {
                        Bucket: process.env.DO_SPACES_BUCKET,
                        Key: filePath,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                        ACL: "public-read",
                    };

                    await s3.send(new PutObjectCommand(uploadParams));

                    // Step 1.5 put url into object
                    const url = `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${uniqueFileName}`
                    tagUrl[tags[index]] = url
                    console.log(tags[index]);
                    const subdomain_tag = String(subdomain) + "_" + String(tags[index])
                    console.log(`Uploading ${subdomain_tag} into database.`)
                    return {
                        originalName: file.originalname,
                        storedName: filePath,
                        tag: subdomain_tag, // Assign the single tag to all files
                        url: url,
                        type: file.mimetype,
                        size: file.size,
                        tenantId: req.tenantId,
                        uploadedBy: userId,
                    };
                })
            );

            // Save all files at once (bulk insert)
            await File.insertMany(uploadedFiles);

            const existConfig = await Config.findOne({ tenantId });

            // Step 2 : Save the file URL into config
            const updatedConfig = await Config.findOneAndUpdate(
                { tenantId },
                {
                    $set: {
                        "img.loginLogoUrl": tagUrl["loginLogo"] ?? existConfig.img.loginLogoUrl,
                        "img.bannerUrl": tagUrl["banner"] ?? existConfig.img.bannerUrl,
                        "img.dashboardLogoUrl": tagUrl["dashboardLogo"] ?? existConfig.img.dashboardLogoUrl,
                    },
                },
                { new: true, runValidators: true }
            );
            return res.status(200).json(updatedConfig.img);
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
