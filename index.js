const express=require('express')
const app=express()
const cors=require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors())
require('dotenv').config()
app.use(express.json())
const stripe=require('stripe')(process.env.STRIPE_SECRET)
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
        const reviewCollections=client.db('grand_auto').collection('review')
        //payment intent 
        app.post('/create-payment-intent', async(req, res) =>{
            const service = req.body;
            const price = service.totalPrice;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });

        app.get('/tools',async(req,res)=>{
            const result=await toolsCollections.find().toArray()
            res.send(result)
        })

        app.get('/tools/:id',async(req,res)=>{
            const id=req.params.id 
            const result=await toolsCollections.findOne({_id:ObjectId(id)})
         
            res.send(result)
            // console.log(result,"two")
            // // const tools=await toolsCollections.find().toArray()
            //  const order=await orderCollections.find().toArray()
            //  order.forEach(item=>{
                
            //      const toolsOrder=order.filter(items=>items._id==ObjectId(id))
            //      console.log(toolsOrder,"got it")
             
            //  })
            // // tools.forEach(tool=>{
            // //     const toolsOrdered=order.filter(items=>items.toolsName===tool.name)
            // //     const orderQuantity=toolsOrdered.map(item=>item.orderQuantity)
               
            // //     const updateQuantity=orderQuantity.reduce((prev,current)=>prev+current,0)
                
            // //     tool.available_quantity -= updateQuantity
            // // })
           
            // // const singleItems=tools.find(item=>parseInt(item._id)===parseInt(id))
            // // res.send(singleItems)
        })
        //book order 
        app.post('/order',async(req,res)=>{
            const book=req.body 
            const result=await orderCollections.insertOne(book) 
            res.send(result)

        });
        //update order after pay
        app.patch('/order/:id',async(req,res)=>{
          const id=req.params.id
          const paymentData=req.body
          const query={_id:ObjectId(id)}
          console.log(id,paymentData,"nope")
          const update={
              $set:{
                transectionId:paymentData.transectionId,
                pay:true 
              }
          }
          const result=await orderCollections.updateOne(query,update)
          res.send(result)
        })
        app.get('/order',async(req,res)=>{
            const email=req.query.email 
            const query={email:email}
            const result=await orderCollections.find(query).toArray()
            res.send(result)
        })
        app.get('/order/:id',async(req,res)=>{
            const id=req.params.id 
            const result=await orderCollections.findOne({_id:ObjectId(id)})
            res.send(result)
            
        })
        app.delete('/order/:id',async(req,res)=>{
            const id=req.params.id 
            const result=await orderCollections.deleteOne({_id:ObjectId(id)})
            res.send(result)
        })
        //available order
        app.get('/availabletools',async(req,res)=>{
            const tools=await toolsCollections.find().toArray()
            const order=await orderCollections.find().toArray()
            tools.forEach(tool=>{
                const toolsOrdered=order.filter(items=>items.toolsName===tool.name)
                const orderQuantity=toolsOrdered.map(item=>item.orderQuantity)
               
                const updateQuantity=orderQuantity.reduce((prev,current)=>prev+current,0)
                
                tool.available_quantity -= updateQuantity
            })
            res.send(tools)
          
        })
        //customer review
        app.post('/review',async(req,res)=>{
            const review=req.body
            const result=await reviewCollections.insertOne(review)
            res.send(result)
        })
        app.get('/review',async(req,res)=>{
            const reviews=await reviewCollections.find().toArray()
            res.send(reviews)
        })
       

    }finally{

    }

}
run().catch(console.dir)




app.listen(port,()=>console.log("Run successfully"))