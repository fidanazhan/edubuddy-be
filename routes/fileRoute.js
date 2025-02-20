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
  try {
      if (!req.tenantId) {
          return res.status(404).json({ error: "Please include tenant on header" });
      }

      const tenantId = req.tenantId;
      const userEmail = req.decodedJWT.email;
      const userRole = req.decodedJWT.role;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const searchQuery = req.query.search || "";

      let searchConditions = { tenantId };

      if (searchQuery) {
          searchConditions.$or = [
              { originalName: { $regex: searchQuery, $options: "i" } },
              // { uplaodedBy: { $regex: searchQuery, $options: "i" } }
          ];
      }

      let files;

      if (userRole.toLowerCase() !== "admin") {
          const user = await User.findOne({ email: userEmail });
          searchConditions.uploadedBy = user._id;

          files = await File.find(searchConditions, 'originalName url type size tag uploadedBy')
              .skip(skip)
              .limit(limit);
      } else {
          files = await File.find(searchConditions, 'originalName url type size tag')
              .populate('uploadedBy', 'name profilePictureUrl')
              .skip(skip)
              .limit(limit);
      }

      const total = await File.countDocuments(searchConditions);

      res.json({
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
          data: files,
      });
  } catch (error) {
      res.status(500).json({ message: "Failed to fetch files", error: error.message });
  }
});


// Upload file
fileRouter.post("/upload", authMiddleware, upload.array("files", 5), async (req, res) => {

  const userId = req.decodedJWT.id;
  const userEmail = req.decodedJWT.email;  
  const tenantId = req.tenantId;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const tag = Array.isArray(req.body.tag) ? req.body.tag[0] : req.body.tag;

    // Process all files before saving
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
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

        return {
          originalName: file.originalname,
          storedName: filePath,
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

fileRouter.post("/delete-multiple", authMiddleware, async (req, res) => {

  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: "Invalid file IDs" });
    }

    // Find all files to delete
    const filesToDelete = await File.find({ _id: { $in: fileIds } });

    if (!filesToDelete.length) {
      return res.status(404).json({ message: "Files not found" });
    }

    // Delete files from DigitalOcean Spaces
    const deletePromises = filesToDelete.map((file) => {
      const deleteParams = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: file.storedName,
      };
      return s3.send(new DeleteObjectCommand(deleteParams));
    });

    await Promise.all(deletePromises);

    // Delete files from database
    await File.deleteMany({ _id: { $in: fileIds } });

    res.json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).json({ message: "Failed to delete files", error: error.message });
  }
});


module.exports = fileRouter;
