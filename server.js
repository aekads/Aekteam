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

// Start Server                                                                 
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});                    


  
