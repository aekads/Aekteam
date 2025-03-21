const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
const authRoutes = require("./routes/authRoutes");
const acquisitionRouter = require('./routes/acquisitionRouter');
const inventoryRoutes = require("./routes/inventoryRoutes");

const ContactRoutes = require("./routes/contactRoutes");


const cors = require("cors");
app.use(cors());




// ✅ Allow CORS for web and mobile app
app.use(cors({
  origin: "*",  // Allows all origins
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow required HTTP methods
  // allowedHeaders: ["Content-Type", "Authorization"] // Allow required headers
}));

//sociey router reporting
const societyRouter = require('./routes/societyRouter');
const fileUpload = require('express-fileupload');
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use("/uploads", express.static("uploads"));
app.use(express.json()); // Routes
app.use("/api", authRoutes);
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);
const inquiryRoutes = require("./routes/inquiryRoutes");
app.use("/api", inquiryRoutes);
app.use('/api', acquisitionRouter);

app.use('/api', societyRouter)

app.use("/api", ContactRoutes);


app.use("/api/inventory", inventoryRoutes);
app.use(fileUpload());
// Render Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.send(
    `<h1>Welcome ${req.session.user.name}!</h1><a href="/logout">Logout</a>`                                         
  );
});                                                                               






//hrms code

const cookieParser = require("cookie-parser");
// const session = require("express-session");
const Swal = require("sweetalert2");
const flash = require("connect-flash");


const authHRRoutes = require("./routes/authHRRoutes");
const hrRoutes = require("./routes/hrRoutes");
const empRoutes = require("./routes/employeeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(flash()); 

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});
const projectRoutes = require("./routes/projectRoutes");





// Dummy Authentication Middleware (Replace with real authentication)
app.use((req, res, next) => {
  req.user = { emp_id: "emp_29" }; // Simulating an authenticated user (Change for testing)
  next();
  
});





app.use("/dashboard/hr", hrRoutes);
app.use("/dashboard/employee", empRoutes);
app.use("/dashboard/employee", leaveRoutes);
app.use(cookieParser()); // Add this middleware
// Routes
app.use("/uploads", express.static("uploads"));
// app.use('/uploads', express.static('uploads'));

// Use Routes
app.use("/dashboard/employee/projects", projectRoutes);

app.use("/", authHRRoutes);
app.use(
  upload.fields([
    { name: "passbook_image" },
    { name: "pan_card" },
    { name: "aadhar_card" },
    { name: "offer_letter" },
    { name: "photo" },
    { name: "last_company_experience_letter" },
  ])
);
const cron = require("node-cron");
const leaveService = require("./models/leaveModel");

cron.schedule(
  "0 0 1 * *",
  async () => {
    console.log(
      "Running Monthly Leave Accrual at 12:00 AM on the 1st of every month (Asia/Kolkata)..."
    );
    await leaveService.addMonthlyLeaveBonus();
  },
  {
    timezone: "Asia/Kolkata",
  }
);

app.get("/test-cookies", (req, res) => {
  console.log("Cookies received:", req.cookies);
  res.json({ cookies: req.cookies });
});





// Start Server                                                                 
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});                    


   
