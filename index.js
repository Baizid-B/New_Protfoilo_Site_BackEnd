const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;


//
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10, // 100 requests per IP (10 খুব কম)
  message: "Too many requests, try again later",
});

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
// app.use(limiter);

app.get("/", (req, res) => {
  res.send("Server is new open second time");
});

// MONGODB DATABASE
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jhnzp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database connection variables
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

// Routes
app.post(
  "/project",
  limiter,
  [
    body("name").notEmpty().withMessage("Project name is required"),
    body("details")
      .isLength({ min: 10 })
      .withMessage("Details must be at least 10 characters"),
    body("image").isURL().withMessage("Image must be a valid URL"),
    body("multiple").isURL().withMessage("Image must be a valid URL"),
  ],
  async (req, res) => {
    try {
      // Check validation result
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if DB is connected
      if (!projectCollcetion) {
        return res.status(500).json({ error: "Database not connected" });
      }

      // If validation passed, insert into MongoDB
      const projectData = req.body;
      const result = await projectCollcetion.insertOne(projectData);
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// project data show in front end---
app.get("/projects", async (req, res) => {
  try {
    // Check if DB is connected
    if (!projectCollcetion) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const cursor = projectCollcetion.find();
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// Single project data show in front end----
app.get("/projects/:id", async (req, res) => {
  try {
    // Check if DB is connected
    if (!projectCollcetion) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const id = req.params.id;
    console.log("Requested ID:", id);

    const query = { _id: new ObjectId(id) };
    const result = await projectCollcetion.findOne(query);

    console.log("Found Project:", result);

    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.send(result);
  } catch (error) {
    console.error(error);
    
    // Check if error is due to invalid ObjectId
    if (error.message.includes("ObjectId")) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server function
async function startServer() {
  try {
    // First connect to MongoDB
    const dbConnected = await connectDB();
    
    if (!dbConnected) {
      console.log("❌ Server starting without database connection");
    }
    
    // Then start Express server
    app.listen(port, () => {
      console.log(`🚀 Server is running on port: ${port}`);
    });
    
    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await client.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();