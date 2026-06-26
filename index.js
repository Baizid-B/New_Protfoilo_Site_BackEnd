const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");

const chatRoutes = require("./routes/chat");

const app = express();

// Middlewares
app.set('trust proxy', true);
app.use(cors({
    origin: ["http://localhost:5173", "https://baizid-bostami-b.netlify.app"],
    credentials: true,
}));
app.use(express.json());
app.use(helmet());

// MongoDB Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jhnzp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db;

// DB connection middleware - reuses existing connection if available
const connectToDB = async (req, res, next) => {
    if (db) {
        req.projectCollcetion = db.collection("projectList");
        return next();
    }
    try {
        await client.connect();
        db = client.db("projectdb");
        req.projectCollcetion = db.collection("projectList");
        next();
    } catch (err) {
        res.status(500).json({ error: "MongoDB Connection Failed" });
    }
};

// Routes
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
    res.send("Server is running perfectly");
});

// Get all projects
app.get("/projects", connectToDB, async (req, res) => {
    try {
        const result = await req.projectCollcetion.find().toArray();
        res.send(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single project by ID
app.get("/projects/:id", connectToDB, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await req.projectCollcetion.findOne({ _id: new ObjectId(id) });

        if (!result) {
            return res.status(404).json({ error: "Project not found" });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new project
app.post("/project", connectToDB, [
    body("name").notEmpty(),
    body("details").isLength({ min: 10 }),
    body("image").isURL(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const userIP = req.ip || req.headers['x-forwarded-for'];
        const existingCount = await req.projectCollcetion.countDocuments({ userIP });

        // Limit each IP to max 2 projects
        if (existingCount >= 2) {
            return res.status(403).json({ error: "Limit Reached" });
        }

        const result = await req.projectCollcetion.insertOne({ ...req.body, userIP, createdAt: new Date() });
        res.send(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export for Vercel (no app.listen needed)
module.exports = app;