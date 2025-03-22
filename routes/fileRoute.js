const express = require("express");
const multer = require("multer");
const File = require("../models/File");
const User = require("../models/User");
const { Storage } = require("@google-cloud/storage");
const fileRouter = express.Router();
const authMiddleware = require("../middleware/authMiddleware")

// Configure DigitalOcean Spaces with AWS SDK v3
const googleStorage = new Storage({
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE, // Path to your service account JSON
  projectId: process.env.GOOGLE_CLOUD_PROJECT,  // Your Google Cloud Project ID
});

const bucket = googleStorage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

// Configure Multer for file uploads (without multer-s3)
const storage = multer.memoryStorage();
const upload = multer({ storage });


fileRouter.post("/upload", authMiddleware, upload.array("files", 5), async (req, res) => {
  const userId = req.decodedJWT.id;
  const userEmail = req.decodedJWT.email;
  const tenantCode = req.tenantName;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const totalUploadSize = req.files.reduce((sum, file) => sum + file.size, 0);

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has enough storage left
    if (user.usedStorage + totalUploadSize > user.totalStorage) {
      return res.status(400).json({ message: "Not enough storage space" });
    }

    const tag = Array.isArray(req.body.tag) ? req.body.tag[0] : req.body.tag;

    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const uniqueFileName = `${Date.now()}-${file.originalname}`;
        // const filePath = `${tenantCode}/${userEmail}/${uniqueFileName}`;
        const filePath = `${uniqueFileName}`;
        const gcsFile = bucket.file(filePath);

        // Upload file to Google Cloud Storage
        await gcsFile.save(file.buffer, {
          metadata: { contentType: file.mimetype },
          //public: true, // Make file publicly accessible
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        return {
          originalName: file.originalname,
          storedName: filePath,
          tag: tag,
          url: publicUrl,
          type: file.mimetype,
          size: file.size,
          tenantId: req.tenantId,
          uploadedBy: userId,
        };
      })
    );

    await File.insertMany(uploadedFiles);

    user.usedStorage += totalUploadSize;
    await user.save();

    res.status(201).json({ message: "Files uploaded successfully"});
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});


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

// Delete a single file
fileRouter.delete("/delete/:id", authMiddleware, async (req, res) => {

  let userId = req.decodedJWT.id;

  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Fetch user
    const user = await User.findById(file.uploadedBy);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const gcsFile = bucket.file(file.storedName);
    await gcsFile.delete();

    // Delete file record
    await File.findByIdAndDelete(req.params.id);

    // Update usedStorage
    user.usedStorage = Math.max(user.usedStorage - file.size, 0);
    await user.save();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

// Delete multiple files
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

    // Group files by user ID and calculate total size per user
    const userStorageUpdates = filesToDelete.reduce((acc, file) => {
      acc[file.uploadedBy] = (acc[file.uploadedBy] || 0) + file.size;
      return acc;
    }, {});

    // Delete files from Google Cloud Storage in parallel
    await Promise.all(filesToDelete.map((file) => bucket.file(file.storedName).delete()));

    // Delete file records from the database
    await File.deleteMany({ _id: { $in: fileIds } });

    // Prepare bulk update operations
    const bulkOperations = Object.entries(userStorageUpdates).map(([userId, sizeToReduce]) => ({
      updateOne: {
        filter: { _id: userId },
        update: { $inc: { usedStorage: -sizeToReduce } },
      },
    }));

    // Perform a single bulk update for all users
    if (bulkOperations.length > 0) {
      await User.bulkWrite(bulkOperations);
    }

    res.json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).json({ message: "Failed to delete files", error: error.message });
  }
});


module.exports = fileRouter;
