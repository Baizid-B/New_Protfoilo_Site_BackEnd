const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");

// routes import
const chatRoutes = require("./routes/chat");

const app = express();
const port = process.env.PORT || 5000;

// লাইভ সার্ভারে বা লোকালহোস্টে সঠিক আইপি পাওয়ার জন্য
app.set('trust proxy', true);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://baizid-bostami-b.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(helmet());

// route use
app.use("/api/chat", chatRoutes);


// --- MONGODB CONNECTION ---
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jhnzp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let projectCollcetion;

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected Successfully!");
    const database = client.db("projectdb");
    projectCollcetion = database.collection("projectList");
    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    return false;
  }
}

// --- ROUTES ---

app.get("/", (req, res) => {
  res.send("Server is running perfectly");
});

// নতুন প্রজেক্ট অ্যাড করার মেইন রুট (Limit logic সহ)
app.post(
  "/project",
  [
    body("name").notEmpty().withMessage("Project name is required"),
    body("details").isLength({ min: 10 }).withMessage("Details must be at least 10 characters"),
    body("image").isURL().withMessage("Image must be a valid URL"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!projectCollcetion) {
        return res.status(500).json({ error: "Database not connected" });
      }

      const userIP = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      console.log("-----------------------------------------");
      console.log("Incoming Request from IP:", userIP);

      const existingProjectCount = await projectCollcetion.countDocuments({ userIP: userIP });
      
      console.log(`এই আইপি (${userIP}) থেকে ডাটাবেজে প্রজেক্ট আছে: ${existingProjectCount} টি`);

      if (existingProjectCount >= 2) {
        console.log("❌ লিমিট শেষ! প্রজেক্ট অ্যাড করা ব্লক করা হয়েছে।");
        console.log("-----------------------------------------");
        return res.status(403).json({ 
          error: "Limit Reached", 
          message: "আপনি আপনার আইপি থেকে সর্বোচ্চ ২টা প্রজেক্ট অ্যাড করতে পারবেন।" 
        });
      }

      const projectData = {
        ...req.body,
        userIP: userIP,
        createdAt: new Date()
      };

      const result = await projectCollcetion.insertOne(projectData);
      
      console.log("✅ প্রজেক্ট সফলভাবে সেভ হয়েছে!");
      console.log("-----------------------------------------");
      res.send(result);

    } catch (error) {
      console.error("Error adding project:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// সব প্রজেক্ট রিড করা
app.get("/projects", async (req, res) => {
  try {
    if (!projectCollcetion) return res.status(500).json({ error: "DB not connected" });
    const result = await projectCollcetion.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// সিঙ্গেল প্রজেক্ট আইডি দিয়ে খোঁজা
app.get("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await projectCollcetion.findOne(query);
    if (!result) return res.status(404).json({ error: "Project not found" });
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: "Invalid ID format or Server error" });
  }
});

// --- SERVER START ---
async function startServer() {
  try {
    const dbConnected = await connectDB();
    if (dbConnected) {
      app.listen(port, () => {
        console.log(`🚀 Server is running on port: ${port}`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();