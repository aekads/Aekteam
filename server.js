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

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
