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
  origin: ["http://localhost:5175"],
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
  // console.log("token int the middleware", token);
  //jodi token na pai
  if(!token){
    return res.status(401).send({message:"unAuthorized access"})
  }
  jwt.verify(token, process.env.SECRET_KEY,(error, decoded)=>{
    if(error){
      return res.status(401).send({message:"unAuthorized access"})
    }
   req.user = decoded
    next()
  })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const foodCollection = client.db("shareFoodDB").collection("foodCollection")
    const foodRequestCollection=client.db("shareFoodDB").collection("foodRequestCollection")
    
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
    app.get("/getFood", async (req, res) => {

      let sortObj={}
     let queryObj = {}
     
     const foodName =req.query.foodName 
     const sortField= req.query.sortField
     const sortOrder =req.query.sortOrder 

    //  const limit = Number(req.query.limit)
  
    //filter
    
      if(foodName){
      queryObj.foodName={
        $regex:foodName,
        $options: "i",
      }
     }

     //sorting
     if (sortField && sortOrder) {
      sortObj[sortField] = sortOrder ;
    }
      const cursor = foodCollection.find(queryObj).sort(sortObj)
      const result = await cursor.toArray()
      res.send(result)
    })

    //featuredFood 
    app.get("/featuredFood", async(req, res)=>{
      const result = await foodCollection.find({}).sort({foodQuantity:-1}).toArray()
      res.send(result)
    })

    //find single food 
    app.get("/getFood/:id", async (req, res) => {
      // console.log(req.cookies);
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query)
      res.send(result)
      console.log(result);
    })
    app.get("/getFoods/:id", async (req, res) => {
      // console.log(req.cookies);
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query)
      res.send(result)
      console.log(result);
    })

   //manage get good 
   app.get('/manageFood/:email', verifyToken, async(req, res)=>{
    if(req.params.email!==req.user.email){
      return res.status(403).send({message: "forbidden access"})
    }
    const cursor = foodCollection.find({donatorEmail:req.params.email})
    const manageFoods = await cursor.toArray()
    res.send(manageFoods)
   })
    
    //foodRequestCollection post(create) api
    app.post("/requestFood", async (req, res) => {
      const food = req.body;
      const result = await foodRequestCollection.insertOne(food)
      res.send(result)
    })

 ////get foodRequestCollection  api
app.get("/requestFood",  async(req, res)=>{
  const cursor = foodRequestCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

//manageSingleFood 
app.get("/requestFood/:id", async(req,res)=>{
  const id = req.params.id
  const filter ={requestFoodId : id}
  const result = await foodRequestCollection.find(filter).toArray()
  res.send(result)

})

//getUser request food 
app.get("/getUserRequestFood", verifyToken, async(req,res)=>{
     
  if(req.user.email !== req.query.email){
    return res.status(403).send({message: "forbidden access"})
  }


  let query ={}
  if(req.query?.email){
    query={UserEmail: req.query.email}
  }
  const result = await foodRequestCollection.find(query).toArray()
  res.send(result)
})



//food status update (delivered)
app.patch("/requestFoodDelivered/:id", async(req, res)=>{
  const id= req.params.id
  const filter ={_id:new ObjectId(id)}
  const updateReq={
    $set:{
      isDelivered: true
    }
  }
  const result =await foodRequestCollection.updateOne(filter, updateReq)
  res.send(result)
})
// update manage section
app.patch('/updateFood/:id', async(req,res)=>{
  const id= req.params.id
  const filter ={_id : new ObjectId(id)}
  const query =req.body
  const updateFood ={
    $set:{
      foodName:query.foodName,
      foodImage:query.foodImage,
      foodQuantity:query.foodQuantity,
      pickupLocation:query.pickupLocation,
      expiredDate:query.expiredDate,
      additionalNotes:query.additionalNotes,
      
    }
  }
  const result =await foodCollection.updateOne(filter, updateFood)
  if(result.modifiedCount ==1){
    const reqData= {requestFoodId : id}
    const exist = await foodRequestCollection.findOne(reqData)
    if(exist){
      const reqUpdateDoc ={
        $set:{
          foodName:query.foodName,
        foodImage:query.foodImage,
        pickupLocation:query.pickupLocation,
        expiredDate:query.expiredDate,
        
        }
      }
      const requestResult = await foodRequestCollection.findOne(reqData, reqUpdateDoc)
      res.send(requestResult)
    }else{
      res.send(result)
    }
    }
})
//foodStatus:query.foodStatus,
// foodStatus:query.foodStatus

//request delete 
app.delete("/requestCancel/:id", async(req,res)=>{
  const id =req.params.id 
  const query ={_id : new ObjectId(id)}
  const result = await foodRequestCollection.deleteOne(query)
  res.send(result)
})


//all food delete buuton
app.delete("/getFood/:id", async(req, res)=>{
  const id = req.params.id
  const query ={_id : new ObjectId( id)}
  const result = await foodCollection.deleteOne(query)
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