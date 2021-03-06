const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
require("dotenv").config();
app.use(express.json());
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 4000;



app.get("/", (req, res) => {
  res.send("Welcome to Grand Auto");
});
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.nel7s.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//jot token verification
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const run = async () => {
  try {
    await client.connect();
    const toolsCollections = client.db("grand_auto").collection("tools");
    const orderCollections = client.db("grand_auto").collection("order");
    const reviewCollections = client.db("grand_auto").collection("review");
    const userCollections = client.db("grand_auto").collection("users");
    const messageCollections = client.db("grand_auto").collection("message");

    //admin check
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollections.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    const profileDetailsCollections = client.db("grand_auto").collection("profile");
    //payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.totalPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
   //load all products 
    app.get("/tools", async (req, res) => {
      const result = await toolsCollections.find().toArray();
      res.send(result);
    });
    //load single product 
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const result = await toolsCollections.findOne({ _id: ObjectId(id) });

      res.send(result);
    });
    //delete tools or delete product
    app.delete("/tools/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await toolsCollections.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });
    //book order
    app.post("/order", verifyJWT, async (req, res) => {
      const book = req.body;
      const result = await orderCollections.insertOne(book);
      res.send(result);
    });
    //update order after pay
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const paymentData = req.body;
      const query = { _id: ObjectId(id) };
      const update = {
        $set: {
          transectionId: paymentData.transectionId,
          pay: true,
          status: "pending",
        },
      };
      const result = await orderCollections.updateOne(query, update);
      res.send(result);
    });
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await orderCollections.find(query).toArray();
      res.send(result);
    });
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const result = await orderCollections.findOne({ _id: ObjectId(id) });
      res.send(result);
    });
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const result = await orderCollections.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });
    //load all orders for admin
    app.get("/allorders", verifyJWT, verifyAdmin, async (req, res) => {
      const orders = await orderCollections.find({}).toArray();
      res.send(orders);
    });
    //change order status
    app.patch("/updatestatus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const updateStatus = {
        $set: {
          status: "shift",
        },
      };
      const result = await orderCollections.updateOne(query, updateStatus);
      res.send(result);
    });
 
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollections.insertOne(review);
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const reviews = await reviewCollections.find().toArray();
      res.send(reviews);
    });

    //my profile details
    app.put("/profile-details/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          education: user.education,
          facebook: user.facebook,
          linkedin: user.linkedin,
          phone: user.phone,
          city: user.city,
          name: user.name,
          email: user.email,
        },
      };

      const result = await profileDetailsCollections.updateOne(
        filter,
        updateDoc,
        options
      );

      res.send(result);
    });

    //load my profile information
    app.get("/profile-details/", verifyJWT, async (req, res) => {
      const email = req.query.email;

      const result = await profileDetailsCollections.findOne({ email: email });
      if (!result) {
        res.send({ find: false });
        return;
      } else {
        res.send(result);
      }
    });
    //store user information
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const token = jwt.sign({ email: email }, process.env.TOKEN_SECRET, {
        expiresIn: "7d",
      });
      const result = await userCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send({ token });
    });

    //get all users
    app.get("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await userCollections.find().toArray();
      res.send(users);
    });
    //delete user
    app.delete("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      const deleteUser = await userCollections.deleteOne({ email: email });
      res.send(deleteUser);
    });
    //make admin
    app.put("/makeadmin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    //check if admin
    app.get("/admin", async (req, res) => {
      const email = req.query.email;
      const getUser = await userCollections.findOne({ email: email });
      if (getUser) {
        const isAdmin = getUser.role === "admin";
        return res.send({ admin: isAdmin });
      } else {
        return res.send({ admin: false });
      }
    });

    //add product to product collection
    app.post("/addproduct", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await toolsCollections.insertOne(product);
      res.send(result);
    });

    //send message api
    app.post("/sendmessage", async (req, res) => {
      const message = req.body;
      const result = await messageCollections.insertOne(message);
      res.send(result);
    });
  } finally {
  }
};
run().catch(console.dir);

app.listen(port, () => console.log("Run successfully"));
