const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const File = require("../models/File");
const User = require("../models/User");
const fileRouter = express.Router();
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

// Get files
fileRouter.get("/", authMiddleware, async (req, res) => {

    const tenantId = req.tenantId
    const userEmail = req.user.email
    const userRole = req.user.role

    console.log("Tenant Id: " + tenantId)
    console.log("User Email: " + userEmail)

    try {

      let user = null; 
      let files = [];

      if(userRole.toLowerCase() === "admin"){
        files = await File.find({ tenantId: tenantId}); 
      }else{
         user = await User.find({ email: userEmail});
         files = await File.find({ tenantId: tenantId, uploadedBy: user}); 
      }

      res.status(200).json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files", error: error.message });
    }
  });

// Upload file
fileRouter.post("/upload", authMiddleware, upload.array("files", 5), async (req, res) => {
  const userId = req.user.id;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const tag = Array.isArray(req.body.tag) ? req.body.tag[0] : req.body.tag;

    // Process all files before saving
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const uniqueFileName = `${Date.now()}-${file.originalname}`;
        const uploadParams = {
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: uniqueFileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        };

        await s3.send(new PutObjectCommand(uploadParams));

        return {
          originalName: file.originalname,
          storedName: uniqueFileName,
          tag: tag, // Assign the single tag to all files
          url: `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${uniqueFileName}`,
          type: file.mimetype,
          size: file.size,
          tenantId: req.tenantId,
          uploadedBy: userId,
        };
      })
    );

    // Save all files at once (bulk insert)
    await File.insertMany(uploadedFiles);

    res.status(201).json({ message: "Files uploaded successfully", files: uploadedFiles });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// Delete file
fileRouter.delete("/delete/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const deleteParams = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: file.storedName,
    };

    await s3.send(new DeleteObjectCommand(deleteParams));

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

module.exports = fileRouter;
