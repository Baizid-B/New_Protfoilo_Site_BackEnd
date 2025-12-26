const express = require("express")
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require("cors")
require("dotenv").config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

app.get('/',(req,res) =>{
    res.send("Server is new open second time")
})

// MONGODB DATABASE

const uri = "mongodb+srv://portfolio_list:gpEoDKhVYpEPkDn6@cluster0.jhnzp.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const database = client.db("projectdb")
    const projectCollcetion = database.collection("projectList")

    // project data posta in backend ---
    app.post('/project', async(req,res) =>{
      const projectData = req.body;
      const result = await projectCollcetion.insertOne(projectData)
      res.send(result)
    })

    // project data show in front end---
    app.get('/projects',async(req,res) =>{
      const cusrsor = projectCollcetion.find()
      const result = await cusrsor.toArray()
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    app.listen(port,(req,res)=>{
    console.log("Port is:", port );
})
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
