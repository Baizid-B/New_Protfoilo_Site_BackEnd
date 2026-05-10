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

// কানেকশন হ্যান্ডলার (Middleware হিসেবে)
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

// সব প্রজেক্ট রিড করা (connectToDB middleware যুক্ত করা হয়েছে)
app.get("/projects", connectToDB, async (req, res) => {
    try {
        const result = await req.projectCollcetion.find().toArray();
        res.send(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// প্রজেক্ট অ্যাড করা (connectToDB middleware যুক্ত করা হয়েছে)
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

        if (existingCount >= 2) {
            return res.status(403).json({ error: "Limit Reached" });
        }

        const result = await req.projectCollcetion.insertOne({ ...req.body, userIP, createdAt: new Date() });
        res.send(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vercel-এর জন্য এক্সপোর্ট (Listen করার প্রয়োজন নেই)
module.exports = app;