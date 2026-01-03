const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 5, // 5 requests per IP
  message: "Too many requests, try again later",
});

app.use(
  cors({
    origin: ["http://localhost:5173", ""],
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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jhnzp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("projectdb");
    const projectCollcetion = database.collection("projectList");

    const { body, validationResult } = require("express-validator");

    app.post(
      "/project",limiter,
      [
        body("name").notEmpty().withMessage("Project name is required"),
        body("details")
          .isLength({ min: 5})
          .withMessage("Details must be at least 10 characters"),
        body("image").isURL().withMessage("Image must be a valid URL"),
        body("multiple")
          .isArray()
          .withMessage("Multiple images must be an array"),
      ],
      async (req, res) => {
        // Check validation result
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        // If validation passed, insert into MongoDB
        const projectData = req.body;
        const result = await projectCollcetion.insertOne(projectData);
        res.send(result);
      }
    );

    // project data show in front end---
    app.get("/projects", async (req, res) => {
      try {
        const cusrsor = projectCollcetion.find();
        const result = await cusrsor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Send a ping to confirm a successful connection
    app.listen(port, (req, res) => {
      console.log(`Port is: ${port} `);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
