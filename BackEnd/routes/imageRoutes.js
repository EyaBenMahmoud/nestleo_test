const express = require('express');
const { protect } = require('../Middlewares/AuthMiddleware');
const upload = require('../Middlewares/upload');
const User = require('../Models/User');
const router = express.Router();
const sharp = require('sharp');
const updateAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Check file size (limit to 1MB)
    if (req.file.size > 1024 * 1024) {
      return res.status(400).json({ message: "File size should not exceed 1MB" });
    }
   try {
      // Resize and optimize the image
      const optimizedBuffer = await sharp(req.file.buffer)
        .resize(200, 200) // Resize to 200x200px
        .jpeg({ quality: 80 }) // Compress to 80% quality
        .toBuffer();
      
      // Convert the optimized buffer to base64
      const base64Data = optimizedBuffer.toString('base64');
      const base64Image = `data:${req.file.mimetype};base64,${base64Data}`;
      
      // Update user's avatar field with the base64 string
      user.avatar = base64Image;
      await user.save();
      
      res.status(200).json({
        message: "Avatar updated successfully",
        avatar: base64Image // Return the base64 image to the client
      });
    } catch (err) {
      console.error("Image processing error:", err);
      return res.status(500).json({ message: "Error processing image" });
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("avatar"); // ✅ Populate avatar reference

    if (!user || !user.avatar) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    res.set("Content-Type", user.avatar.contentType);
    res.send(user.avatar.data);
  } catch (error) {
    console.error("Error fetching avatar:", error);
    res.status(500).json({ message: error.message });
  }
};


// Upload avatar
router.put('/avatar', protect, upload.single('avatar'), updateAvatar);


module.exports = router;