const express=require('express')
const app=express()
const cors=require('cors')
app.use(cors())
require('dotenv').config()
app.use(express.json())
const port=process.env.PORT || 4000



app.get('/',(req,res)=>{
    res.send("Welcome to Grand Auto")
})


app.listen(port,()=>console.log("Run successfully"))