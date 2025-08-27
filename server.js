const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const cron = require("node-cron");
const dotenv = require("dotenv");
const path = require("path");
const db = require("./config/db");

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');


dotenv.config(); // Load environment variables

const app = express();

const leaveAPIRoutes = require('./routes/leaveAPIRoutes'); 

app.use(bodyParser.json()); 
app.use('/api', leaveAPIRoutes);// for JSON requests

// ✅ Enable CORS
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
  })
);

// ✅ Middleware Order: Session, JSON, URL-Encoded
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(flash());

// ✅ Set View Engine
app.set("view engine", "ejs");

// ✅ Static Files
app.use("/uploads", express.static("uploads"));

// ✅ Dummy Authentication Middleware (For Testing)
app.use((req, res, next) => {
  req.user = { emp_id: "emp_29" }; // Simulated authenticated user
  next();
});

// ✅ Routes Import
const authRoutes = require("./routes/authRoutes");
const acquisitionRouter = require("./routes/acquisitionRouter");
const inventoryRoutes = require("./routes/inventoryRoutes");
const contactRoutes = require("./routes/contactRoutes");
const societyRouter = require("./routes/societyRouter");
const inquiryRoutes = require("./routes/inquiryRoutes");
const projectRoutes = require("./routes/projectRoutes");
const authHRRoutes = require("./routes/authHRRoutes");
const hrRoutes = require("./routes/hrRoutes");
const empRoutes = require("./routes/employeeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const adminRoutes = require("./routes/pointtableRouter");

// ✅ Apply Routes
app.use("/api", authRoutes);
app.use("/api", inquiryRoutes);
app.use("/api", acquisitionRouter);
app.use("/api", societyRouter);
app.use("/api", contactRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/dashboard/hr", hrRoutes);
app.use("/dashboard/employee", empRoutes);
app.use("/dashboard/employee", leaveRoutes);
app.use("/dashboard/employee/projects", projectRoutes);
app.use("/", authHRRoutes);              
// Routes
app.use("/IPL", adminRoutes);

// app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ File Uploads (Using Multer)                    
const upload = multer({ dest: "uploads/" });
app.post("/test-upload", upload.single("photo"), (req, res) => {
  console.log("Uploaded file:", req.file);
  res.json({ success: true, file: req.file });
});

// ✅ HRMS File Upload Middleware (Apply only to HRMS routes)
const hrmsUpload = upload.fields([
  { name: "passbook_image" },
  { name: "pan_card" },
  { name: "aadhar_card" },
  { name: "offer_letter" },
  { name: "photo" },
  { name: "last_company_experience_letter" },
]);
app.use("/dashboard/hr/upload", hrmsUpload);

// ✅ Monthly Leave Accrual (Cron Job)
const leaveService = require("./models/leaveModel");
cron.schedule(
  "0 0 1 * *",
  async () => {
    console.log("Running Monthly Leave Accrual at 12:00 AM on the 1st of every month (Asia/Kolkata)...");
    await leaveService.addMonthlyLeaveBonus();
  },
  {
    timezone: "Asia/Kolkata",
  }
);

// ✅ Test Cookies Endpoint
app.get("/test-cookies", (req, res) => {
  console.log("Cookies received:", req.cookies);
  res.json({ cookies: req.cookies });
});



// Setup Nodemailer and send OTP email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
         user: 'aekads.otp@gmail.com',
          pass: "nait yiag ebyg cxwk",
        },
      }); 

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: 'aekads.otp@gmail.com',
    to: email,
    subject: "Your OTP Code",
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
  });
};

// 🔐 Secure, randomly generated 256-bit secret
const JWT_SECRET = "vL9#yQ1m8z@P3rT!xEk2W7c$A6BnZ0Uv"; // Keep this private

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email },JWT_SECRET, {
    expiresIn: "1h",
  });
};

// 1. Register API
app.post("/api/websitesales/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const userCheck = await db.query(`SELECT * FROM websitesalesusers WHERE email = $1`, [email]);
    if (userCheck.rows.length > 0)
      return res.status(409).json({ error: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO websitesalesusers (email, password, otp, otp_expiry, status) VALUES ($1, $2, $3, $4, $5)`,
      [email, hashed, otp, expiry, "pending"]
    );

    sendOTP(email, otp).catch(console.error); // async send

    return res.status(201).json({ message: "Registered. OTP sent. Status is pending." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
});


// 2. Login API
app.post("/api/websitesales/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const result = await db.query(`SELECT * FROM websitesalesusers WHERE email = $1`, [email]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found." });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Incorrect password." });

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(`UPDATE websitesalesusers SET otp = $1, otp_expiry = $2 WHERE email = $3`, [
      otp,
      expiry,
      email,
    ]);

    await sendOTP(email, otp);

    return res.status(200).json({ message: "OTP sent to email for verification." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// 3. Verify OTP API
app.post("/api/websitesales/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP are required." });

  try {
    const result = await db.query(`SELECT * FROM websitesalesusers WHERE email = $1`, [email]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found." });

    const user = result.rows[0];

    if (user.otp !== otp)
      return res.status(401).json({ error: "Invalid OTP." });

    if (new Date() > user.otp_expiry)
      return res.status(410).json({ error: "OTP expired." });

    await db.query(
      `UPDATE websitesalesusers SET status = 'active', otp = NULL, otp_expiry = NULL WHERE email = $1`,
      [email]
    );

    const token = generateToken(user);

    return res.status(200).json({ message: "OTP verified. Account activated.", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// 4. Forgot Password API
app.post("/api/websitesales/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ error: "Email is required." });

  try {
    const result = await db.query(`SELECT * FROM websitesalesusers WHERE email = $1`, [email]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found." });

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(`UPDATE websitesalesusers SET otp = $1, otp_expiry = $2 WHERE email = $3`, [
      otp,
      expiry,
      email,
    ]);

    await sendOTP(email, otp);

    return res.status(200).json({ message: "OTP sent to email for password reset." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// 5. Reset Password API
app.post("/api/websitesales/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword)
    return res.status(400).json({ error: "Email, OTP, and new password are required." });

  try {
    const result = await db.query(`SELECT * FROM websitesalesusers WHERE email = $1`, [email]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found." });

    const user = result.rows[0];

    if (user.otp !== otp)
      return res.status(401).json({ error: "Invalid OTP." });

    if (new Date() > user.otp_expiry)
      return res.status(410).json({ error: "OTP has expired." });

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE websitesalesusers SET password = $1, otp = null, otp_expiry = null WHERE email = $2`,
      [hashed, email]
    );

    return res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
});



// 6. City Wise Properties
app.get('/api/websitesales/city-info/:city', async (req, res) => {
  try {
    const city = req.params.city;

    if (!city || city.trim() === '') {
      return res.status(400).json({ success: false, error: 'City parameter is required' });
    }

    // Step 1: Get zones
    const zonesResult = await db.query(`
      SELECT DISTINCT zone FROM inventory_properties
      WHERE LOWER(city) = LOWER($1)
    `, [city]);
    const zones = zonesResult.rows.map(row => row.zone);

    // Step 2: Get all properties
    const propertiesResult = await db.query(`
      SELECT * FROM inventory_properties
      WHERE LOWER(city) = LOWER($1)
      ORDER BY propertyid DESC
    `, [city]);
    const properties = propertiesResult.rows;

    // Step 3: Get all screens
    const screensResult = await db.query(`SELECT screenid, screenname FROM screens`);
    const screensMap = {};
    for (const screen of screensResult.rows) {
      screensMap[screen.screenid] = screen.screenname.trim();
    }

    // Step 4: Replace screenids with id-name format
    const formattedProperties = properties.map(prop => {
      const updatedScreenIds = (prop.screenids || []).map(id => {
        const screenName = screensMap[id] || '';
        return `${id}-${screenName}`;
      });
      return { ...prop, screenids: updatedScreenIds };
    });

    // Step 5: Respond
    res.json({
      success: true,
      city: city,
      zones: zones,
      properties: formattedProperties
    });

  } catch (err) {
    console.error('Error in /api/city-info/:city:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});




//api for createing user campaigns

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinaryLib = require('cloudinary').v2;

// ✅ Configure Cloudinary
cloudinaryLib.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Configure storage for Cloudinary
const campaignVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinaryLib,
  params: {
    folder: 'campaign_videos',
    resource_type: 'video',
    format: async () => 'mp4', // Always convert to mp4
    public_id: (req, file) => {
      const timestamp = Date.now();
      return `campaign_${timestamp}_${file.originalname.split('.')[0]}`;
    },
  },
});

// ✅ Multer middleware
const campaignVideoUpload = multer({ 
  storage: campaignVideoStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// ✅ Multiple upload middleware (up to 10 files)
const campaignVideoUploadMultiple = campaignVideoUpload.array('media', 10);
 
// ✅ Campaign API
// --- Create Paid Campaign (deduct wallet balance) ---
// --- Create Paid Campaign (deduct wallet balance) ---

app.post('/api/websitesales/campaigns', async (req, res) => {
  campaignVideoUploadMultiple(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Too many files. Maximum 10 videos allowed.',
        });
      }
      return res.status(500).json({ message: 'File upload error', error: err.message });
    } else if (err) {
      return res.status(500).json({ message: 'File upload error', error: err.message });
    }

    try {
      // ✅ Parse inputs
      const duration_days = req.body.duration_days ? parseInt(req.body.duration_days) : null;
      const user_email = req.body.user_email || null;
      const campaign_name = req.body.campaign_name || null;
      const start_date = req.body.start_date || null;
      let end_date = req.body.end_date || null;
      const package_name = req.body.package_name || null;

      if (Array.isArray(end_date)) end_date = end_date[0];
      if (!end_date && start_date && duration_days) {
        const start = new Date(start_date);
        start.setDate(start.getDate() + duration_days);
        end_date = start.toISOString().split('T')[0];
      }

      let totals = {};
      try { totals = JSON.parse(req.body.totals || '{}'); } catch {}
      let selected_targets = [];
      try {
        selected_targets = JSON.parse(req.body.selected_targets || '[]');
        if (Array.isArray(selected_targets)) {
          selected_targets = selected_targets.map((t) => (typeof t === 'string' ? JSON.parse(t) : t));
        }
      } catch {}

      const uploadedFiles = req.files || [];

      // ✅ STEP 1: Get wallet
      const walletRes = await db.query(
        'SELECT wallet_balance FROM public.websitesalesusers WHERE email = $1',
        [user_email]
      );
      if (walletRes.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      let walletBalance = Number(walletRes.rows[0].wallet_balance || 0);

      const campaignCost = Number(totals?.grandTotal || 0);
      if (walletBalance < campaignCost) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      // ✅ STEP 2: Deduct balance (atomic)
      walletBalance -= campaignCost;
      await db.query(
        'UPDATE public.websitesalesusers SET wallet_balance = $1 WHERE email = $2',
        [walletBalance, user_email]
      );

      // ✅ STEP 3: Insert campaign
      const campaignResult = await db.query(
        `INSERT INTO campaigns 
          (user_email, campaign_name, start_date, duration_days, end_date, package_name, totals, selected_targets, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'active', NOW(), NOW())
         RETURNING id`,
        [
          user_email,
          campaign_name,
          start_date,
          duration_days,
          end_date,
          package_name,
          JSON.stringify(totals),
          JSON.stringify(selected_targets),
        ]
      );

      const campaignId = campaignResult.rows[0].id;
      const mediaUrls = [];

      // ✅ STEP 4: Save videos
      if (uploadedFiles.length > 0) {
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const videoType = file.mimetype;
          const videoClientName = file.originalname;
          const videoTag = `${campaignId}_${i + 1}`;

          const videoResult = await db.query(
            `INSERT INTO videos_campaigns 
              (campaign_id, video_type, video_url, video_client_name, video_tag) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING video_id`,
            [campaignId, videoType, file.path, videoClientName, videoTag]
          );

          mediaUrls.push({
            video_id: videoResult.rows[0].video_id,
            video_url: file.path,
          });
        }

        await db.query(
          'UPDATE campaigns SET media_url = $1::jsonb WHERE id = $2',
          [JSON.stringify(mediaUrls), campaignId]
        );
      }

      // ✅ Done
      res.status(201).json({
        message: '✅ Campaign saved & balance deducted',
        campaign: { campaign_id: campaignId, campaign_name, media_url: mediaUrls },
        new_wallet_balance: walletBalance,
        videos_count: uploadedFiles.length,
      });
    } catch (err) {
      console.error('❌ Error saving campaign:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
});

// --- Wallet Balance API ---
app.get("/api/websitesales/wallet-balance", async (req, res) => {
  // console.log("GET /api/websitesales/wallet-balance called");
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const result = await db.query(
      "SELECT wallet_balance FROM public.websitesalesusers WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ wallet_balance: result.rows[0].wallet_balance || 0 });
  } catch (err) {
    console.error("Error fetching wallet balance:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// POST /api/websitesales/campaigns/draft - Save campaign as draft
// --- Save Draft Campaign (NO balance cut) ---
app.post('/api/websitesales/campaigns/draft', async (req, res) => {
  campaignVideoUploadMultiple(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Too many files. Maximum 10 videos allowed.',
        });
      }
      return res.status(500).json({ message: 'File upload error', error: err.message });
    } else if (err) {
      return res.status(500).json({ message: 'File upload error', error: err.message });
    }

    try {
      const duration_days = req.body.duration_days ? parseInt(req.body.duration_days) : 30;
      const user_email = req.body.user_email || null;
      const campaign_name = req.body.campaign_name || 'Draft Campaign';
      const start_date = req.body.start_date || new Date().toISOString().split('T')[0];
      let end_date = req.body.end_date || null;
      const package_name = req.body.package_name || 'Gold';

      if (Array.isArray(end_date)) end_date = end_date[0];
      if (!end_date && start_date && duration_days) {
        const start = new Date(start_date);
        start.setDate(start.getDate() + duration_days);
        end_date = start.toISOString().split('T')[0];
      }

      let totals = {};
      try { totals = JSON.parse(req.body.totals || '{}'); } catch {}
      let selected_targets = [];
      try {
        selected_targets = JSON.parse(req.body.selected_targets || '[]');
        if (Array.isArray(selected_targets)) {
          selected_targets = selected_targets.map((t) => (typeof t === 'string' ? JSON.parse(t) : t));
        }
      } catch {}

      const uploadedFiles = req.files || [];

      const campaignResult = await db.query(
        `INSERT INTO campaigns 
          (user_email, campaign_name, start_date, duration_days, end_date, package_name, totals, selected_targets, status, created_at, updated_at) 
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,'draft',NOW(),NOW())
         RETURNING id`,
        [user_email, campaign_name, start_date, duration_days, end_date, package_name, JSON.stringify(totals), JSON.stringify(selected_targets)]
      );

      const campaignId = campaignResult.rows[0].id;
      const mediaUrls = [];

      if (uploadedFiles.length > 0) {
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const videoType = file.mimetype;
          const videoClientName = file.originalname;
          const videoTag = `${campaignId}_${i + 1}`;

          const videoResult = await db.query(
            `INSERT INTO videos_campaigns 
              (campaign_id, video_type, video_url, video_client_name, video_tag, status) 
             VALUES ($1,$2,$3,$4,$5,'draft')
             RETURNING video_id`,
            [campaignId, videoType, file.path, videoClientName, videoTag]
          );

          mediaUrls.push({
            video_id: videoResult.rows[0].video_id,
            video_url: file.path,
          });
        }

        await db.query(
          'UPDATE campaigns SET media_url = $1::jsonb, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(mediaUrls), campaignId]
        );
      }

      res.status(201).json({
        message: '📝 Draft campaign saved (no wallet deduction)',
        campaign: { campaign_id: campaignId, campaign_name, status: 'draft', media_url: mediaUrls },
        videos_count: uploadedFiles.length,
      });
    } catch (err) {
      console.error('❌ Error saving draft campaign:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
});
// GET /api/websitesales/campaigns/drafts - Retrieve user's draft campaigns
app.get('/api/websitesales/campaigns/drafts', async (req, res) => {
  try {
    // ✅ Extract email from headers (sent by frontend)
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const result = await db.query(
  `SELECT id, campaign_name, start_date, duration_days, end_date, 
          package_name, totals, selected_targets, media_url, created_at
   FROM campaigns 
   WHERE user_email = $1 AND status = 'draft'
   ORDER BY created_at DESC`,
  [userEmail]
);

// ✅ Parse JSON fields if stored as string
const drafts = result.rows.map(r => ({
  ...r,
  totals: typeof r.totals === "string" ? JSON.parse(r.totals) : r.totals,
  selected_targets: typeof r.selected_targets === "string" ? JSON.parse(r.selected_targets) : r.selected_targets
}));

res.json({ drafts, count: drafts.length });

  } catch (err) {
    console.error('❌ Error fetching draft campaigns:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




































// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
