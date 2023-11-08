const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middlewares
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('shelfbud server is running...');
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tklaef2.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const database = client.db("ShelfBud");
    const bookCollection = database.collection("books");

    app.get('/books', async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    })
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const result = await bookCollection.find({ _id: new ObjectId(id) }).toArray();
      res.send(result);
    })
    app.post('/books', async (req, res) => {
      const book = req.body;
      console.log(book);
      const result = await bookCollection.insertOne(book);
      res.send(result);
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`shelfbud server is running on: ${port}`);
})