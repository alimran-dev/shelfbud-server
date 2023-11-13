const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://shelfbud-air.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("shelfbud server is running...");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tklaef2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const database = client.db("ShelfBud");
const bookCollection = database.collection("books");
const orderCollection = database.collection("orders");
const offerCollection = database.collection("offers");
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    // auth related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out: ", user);
      res
        .clearCookie("token", { maxAge: 0,secure: true, sameSite: "none" })
        .send({ success: true });
    });
    // books API
    app.get("/books", async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });
    app.get("/services/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await bookCollection
        .find({ _id: new ObjectId(id) })
        .toArray();
      res.send(result);
    });
    // user based books get
    app.get("/myBooks",verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.user.email !== email) {
        return res.status(401).send({ message: 'unauthorized' });
      }
      const query = { email };
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookCount", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const count = (await bookCollection.countDocuments(query)).toString();
      const result = await { count };
      res.send(result);
    });
    app.get("/sellerOrderCount", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { provider_email: email };
      const count = (await orderCollection.countDocuments(query)).toString();
      const result = await { count };
      res.send(result);
    });
    app.get("/moreFromSeller", async (req, res) => {
      const email = req.query.email;
      console.log({ email });
      const result = await bookCollection.find({ email }).toArray();
      res.send(result);
    });

    // books update put api
    app.put("/books/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const product = req.body;
      const {
        book_name,
        img,
        username,
        email,
        price,
        area,
        description,
        profile_img,
      } = product || {};
      console.log(product);
      if (req.user.email !== email) {
        return res.status(401).send({ message: "unauthorized" });
      }
      const updateProduct = {
        $set: {
          book_name,
          img,
          username,
          email,
          price,
          area,
          description,
          profile_img,
        },
      };
      const options = { upsert: true };
      const result = await bookCollection.updateOne(
        filter,
        updateProduct,
        options
      );
      res.send(result);
    });
    app.post("/books",verifyToken, async (req, res) => {
      const book = req.body;
      console.log(book);
      const result = await bookCollection.insertOne(book);
      res.send(result);
    });

    // Order API
    app.get("/bookings",verifyToken, async (req, res) => {
      const customer_email = req.query.email;
      if (req.user.email !== customer_email) {
        return res.status(401).send({ message: 'unauthorized' });
      }
      const query = { customer_email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/myOrders",verifyToken, async (req, res) => {
      const provider_email = req.query.email;
      if (req.user.email !== provider_email) {
        return res.status(401).send({ message: 'unauthorized' });
      }
      const query = { provider_email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/orders",verifyToken, async (req, res) => {
      const order = req.body;
      console.log(order);
      if (req.user?.email !== order?.customer_email) {
        return res.status(401).send({ message: 'unauthorized' });
      }
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    app.patch("/orderStatus", async (req, res) => {
      const id = req.query.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateStatus = { $set: { status } };
      const result = await orderCollection.updateOne(filter, updateStatus);
      res.send(result);
    });

    // book delete api
    app.delete("/deleteBook/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookCollection.deleteOne(filter);
      res.send(result);
    });
    // offers get api
    app.get("/offers", async (req, res) => {
      const result = await offerCollection.find().toArray();
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`shelfbud server is running on: ${port}`);
});
