
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pool = require('../config/database'); // adjust the path to your pool
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Cloudinary config
cloudinary.config({
  cloud_name: 'dqfnwh89v',
  api_key: '451893856554714',
  api_secret: 'zgbspSZH8AucreQM8aL1AKN9S-Y',
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Public - Table Page
router.get("/", async (req, res) => {
  const teams = await pool.query("SELECT * FROM point_table ORDER BY points DESC");
  const images = await pool.query("SELECT * FROM table_images");
  res.render("IPL/index", { teams: teams.rows, images: images.rows });
});

// Get points table data
router.get("/api/points", async (req, res) => {
  const result = await pool.query("SELECT * FROM point_table ORDER BY points DESC, net_rr DESC");
  res.json(result.rows);
});

// Get images
router.get("/api/images", async (req, res) => {
  const result = await pool.query("SELECT * FROM table_images");
  res.json(result.rows.map(img => img.url));
});

// Admin panel
router.get("/admin", async (req, res) => {
  const teams = await pool.query("SELECT * FROM point_table ORDER BY id");
  const images = await pool.query("SELECT * FROM table_images");
  res.render("IPL/admin", { teams: teams.rows, images: images.rows });
});

// Upload image to Cloudinary
router.post("/admin/upload", upload.single("image"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    await pool.query("INSERT INTO table_images (url) VALUES ($1)", [result.secure_url]);
    res.redirect("/IPL/admin");
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    res.status(500).send("Upload failed");
  }
});

// Delete image
router.post("/admin/delete-image", async (req, res) => {
  const { id } = req.body;
  await pool.query("DELETE FROM table_images WHERE id = $1", [id]);
  res.redirect("/IPL/admin");
});

module.exports = router;
