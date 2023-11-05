const express = require("express")
const cors = require("cors")
const app = express()
require("dotenv").config();
const port = process.env.PORT || 5000

//middleware
app.use(express.json())
app.use(cors())




app.get("/", (req,res)=>{
    res.send("Assignment 11 all data is coming soon!")
})

app.listen(port, (req, res)=>{
    console.log(`This is assignment 11 port ,${port}`);
})