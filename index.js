const express=require('express')
const app=express()
const cors=require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors())
require('dotenv').config()
app.use(express.json())
const port=process.env.PORT || 4000



app.get('/',(req,res)=>{
    res.send("Welcome to Grand Auto")
})


const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.nel7s.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run=async()=>{
    try{

        await  client.connect()
        const toolsCollections=client.db('grand_auto').collection('tools')
        const orderCollections=client.db('grand_auto').collection('order')

        app.get('/tools',async(req,res)=>{
            const result=await toolsCollections.find().toArray()
            res.send(result)
        })

        app.get('/tools/:id',async(req,res)=>{
            const id=req.params.id 
            const query={_id:ObjectId(id)}
            const result=await toolsCollections.findOne(query)
            res.send(result)
        })
        //book order 
        app.post('/order',async(req,res)=>{
            const book=req.body 
            const result=await orderCollections.insertOne(book) 
            res.send(result)

        })

    }finally{

    }

}
run().catch(console.dir)




app.listen(port,()=>console.log("Run successfully"))