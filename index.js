const express = require("express")
const cors = require("cors")
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require("dotenv").config();
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(express.json())
app.use(cors({
  origin: ["http://localhost:5174"],
  credentials: true
}))
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9q6ocyc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middleware 
const verifyToken =(req, res,next)=>{
  const token =req?.cookies?.token
  console.log("token int the middleware", token);
  //jodi token na pai
  if(!token){
    return res.status(401).send({message:"unAuthorized access"})
  }
  jwt.verify(token, process.env.SECRET_KEY,(error, decoded)=>{
    if(error){
      return res.status(401).send({message:"unAuthorized access"})
    }
    res.user = decoded
    next()
  })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const foodCollection = client.db("shareFoodDB").collection("foodCollection")
    
    //auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: "10h" })
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
      }).send({ success:true });
    })

  
    //user logout ar jonno api create korbo 
   app.post("/logout", async(req, res)=>{
    const user = req.body;
    res.clearCookie('token', {maxAge: 0}).send({success : true})
   })

    //all food api
    app.post("/foodAdd", async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food)
      res.send(result)
    })

    //all foods get api
    app.get("/getFood", verifyToken, async (req, res) => {
      console.log("cook cookies",req.cookies);
      const cursor = foodCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    //find single food 
    app.get("/getFood/:id", verifyToken, async (req, res) => {
      console.log(req.cookies);
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("Assignment 11 all data is coming soon!")
})

app.listen(port, (req, res) => {
  console.log(`This is assignment 11 port ,${port}`);
})