const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const stripe = require('stripe')(process.env.PAYEMENT_SECRET_KEY)

const port = process.env.PORT || 5000;

// Middleware
app.use(cors())
app.use(express.json())


// console.log(process.env.tour_User);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.tour_User}:${process.env.tour_pass}@cluster0.7ijeqqy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const placeCollection = client.db('tourismDb').collection('places')
    const cartCollection = client.db('tourismDb').collection('carts');
    const bookingCollection = client.db('tourismDb').collection('bookings');
    const paymentCollection = client.db('tourismDb').collection(' payment');


    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
      })
    }


    // // Search by letter or substring endpoint
    app.get('/search', async (req, res) => {
      const { query } = req.query;
      // console.log( 'from search',query);

      try {
        const searchQuery = { destination: { $regex: query, $options: 'i' } };

        const results = await placeCollection.find(searchQuery).toArray();
        res.send(results);
        // console.log("result ===", results);
      } catch (err) {
        console.error('Error searching destinations:', err);
        res.status(500).json({ error: 'An error occurred while searching destinations' });
      }
    });

    app.post('/create-booking', async (req, res) => {
      try {
        const bookingData = req.body;
        if (!bookingData) {
          return res.status(400).send({ error: 'Booking data is required' });
        }

        const result = await bookingCollection.insertOne(bookingData);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to create booking' });
      }
    });

    app.get('/bookings', async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      console.log("booking data=",bookingData);
      res.send(result)
    })


    // data api from mongo

    app.get('/places', async (req, res) => {
      const result = await placeCollection.find().toArray();
      res.send(result)
    })

    // find data from mongo to server according id
    app.get('/places/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await placeCollection.findOne(query);
      res.send(result)
    })

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      console.log("email=", email);
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    //  sending user daata to db
    app.post('/carts', async (req, res) => {
      const booking = req.body;
      console.log("booking=", booking);
      const result = await cartCollection.insertOne(booking);
      if (result.acknowledged) {
        const createdItem = await cartCollection.findOne({ _id: result.insertedId });
        res.send(createdItem)
      } else {
        res.send("Cart is not created")
      }
      // res.send(result)
    })

    app.get('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.findOne(query);
      res.send(result)
    })


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: '1hr'
      })
      res.send({ token });
    })

    // create payment api
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { price } = req.body;
        if (price === undefined) {
          console.error("No price received in the request");
        }

        // Validate the price input
        if (typeof price !== 'number' || price <= 0) {
          return res.status(400).send({ error: 'Invalid price' });
        }

        const amount = parseInt(price * 100); // Convert to cents
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.post('/payment', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send({ paymentResult })
    })

    // / payment history
    app.get('/billing-details/:email',  async(req,res)=>{
      const query ={email: req.params.email}
      // if(req.params.email !== req.decoded.email){
      //   return res.status(401).send({message:'forbidden access'})
      // }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('tourism manaement server is running')
})

app.listen(port, () => {
  console.log(`tourism server running on:${port}`);
})