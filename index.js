import express, { query } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import { verifyJWT } from "./utils.js";
import Stripe from "stripe";
const app = express();
const port = process.env.PORT || 5000;
dotenv.config();
app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

const uri = process.env.DATABASE_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//STRIPE

const stripe = new Stripe(
  "sk_test_51M6B8WJadxoSok6rrk4UgBHTeA4efuB6IeZpjqogumqAXtAuRMOh6bXSoMqsqB49azRy3gSJxWPP0myOqT21SC2200a1fhFKzu"
);
app.post("/create-payment-intent", async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: +amount * 100,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});
app.post("/create-paypal-order", async (req, res) => {
  console.log("reached here");
  const orderRes = await fetch(
    "https://api-m.sandbox.paypal.com/v2/checkout/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        Authorization:
          "Bearer A21AAL_YapBvYP0VtZiyf2LhDKvSHJHMMyNqvFFmJdveoKQdibKGG4-moKhcuixne2HloY1d2fP9ox4SFHQ1Cmgz1WQnmz5ug",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: "d9f80740-38f0-11e8-b467-0ed5f89f718g",
            amount: { currency_code: "USD", value: "100.00" },
          },
        ],
      }),
    }
  );
  const orderData = await orderRes.json();

  res.send(orderData);
});
app.post("/capture-paypal-order", async (req, res) => {
  const { orderID } = req.body;
  const captureRes = await fetch(
    `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        Authorization:
          "Bearer A21AAL_YapBvYP0VtZiyf2LhDKvSHJHMMyNqvFFmJdveoKQdibKGG4-moKhcuixne2HloY1d2fP9ox4SFHQ1Cmgz1WQnmz5ug",
      },
    }
  );
  const captureData = await captureRes.json();

  res.send({ completed: true });
});

app.get("/", (req, res) => {
  res.send("server running");
});

app.post("/jwt", (req, res) => {
  const token = jwt.sign({ email: req.body.email }, process.env.SECRET);

  res.send({ token });
});
app.get("/services", async (req, res) => {
  let response;
  let count;
  const limit = req.query.limit;

  const perPageItem = req.query.perPageItem;
  const currentPage = req.query.currentPage;
  const search = req.query.search;
  let query = {};

  if (search) {
    query = { name: { $regex: new RegExp(req.query.search, "i") } };
  }

  try {
    const table = client.db("reviewSite-db").collection("services");
    response = limit
      ? await table.find().limit(+limit).sort({ index: 1 }).toArray()
      : perPageItem && currentPage
      ? await table
          .find(query)
          .skip(parseInt(currentPage) * parseInt(perPageItem))
          .limit(+perPageItem)
          .sort({ index: 1 })
          .toArray()
      : await table.find().sort({ index: 1 }).toArray();

    count = await table.countDocuments(query);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send({ response, count });
  }
});

app.get("/services/:id", async (req, res) => {
  const idToFind = req.params.id;
  let response;
  try {
    const table = client.db("reviewSite-db").collection("services");
    const query = { _id: ObjectId(idToFind) };
    response = await table.findOne(query);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.post("/services", async (req, res) => {
  const {
    name,
    description,

    picture,
    ap1,
    ap2,
    price,
    reating,
  } = req.body;

  let response;
  try {
    const table = client.db("reviewSite-db").collection("services");
    const doc = {
      name,
      description,

      picture,
    };
    doc["service-description"] = req.body["service-description"];
    doc.price = +price;
    doc.reating = +reating;
    doc["additional-pictures"] = [];
    if (ap1) {
      doc["additional-pictures"].push(ap1);
    }
    if (ap2) {
      doc["additional-pictures"].push(ap2);
    }
    response = await table.insertOne(doc);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.post("/reviews", verifyJWT, async (req, res) => {
  const { name, review, image, serviceId, email, serviceName } = req.body;
  const doc = { name, review, image, serviceId, email, serviceName };
  doc.createdAt = new Date(Date.now());

  let response;
  try {
    const table = client.db("reviewSite-db").collection("reviews");

    response = await table.insertOne(doc);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.patch("/reviews", verifyJWT, async (req, res) => {
  const { editedReview, revId } = req.body;
  let response;
  try {
    const table = client.db("reviewSite-db").collection("reviews");

    const filter = { _id: ObjectId(revId) };
    const updateDoc = {
      $set: {
        review: editedReview,
        createdAt: new Date(Date.now()),
      },
    };

    response = await table.updateOne(filter, updateDoc);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.delete("/deleteReview", verifyJWT, async (req, res) => {
  let response;
  const { revToDelId } = req.body;

  try {
    const table = client.db("reviewSite-db").collection("reviews");
    const query = { _id: ObjectId(revToDelId) };

    response = await table.deleteOne(query);
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.get("/reviews", verifyJWT, async (req, res) => {
  const { serviceId, email } = req.query;
  if (req.decoded.email !== email) {
    res.status(403).send({ message: "unauthorized" });
  } else {
    const query = serviceId ? { serviceId: serviceId } : { email: email };
    let response;
    try {
      const table = client.db("reviewSite-db").collection("reviews");

      response = await table.find(query).sort({ createdAt: -1 }).toArray();
    } catch (err) {
      response = { message: err.message };
    } finally {
      res.send(response);
    }
  }
});
app.get("/getReviews", async (req, res) => {
  const { serviceId } = req.query;

  const query = { serviceId: serviceId };
  let response;
  try {
    const table = client.db("reviewSite-db").collection("reviews");

    response = await table.find(query).sort({ createdAt: -1 }).toArray();
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});

app.get("/first3reviews", async (req, res) => {
  let response;
  try {
    const table = client.db("reviewSite-db").collection("reviews");
    const arr = await table.distinct("name");

    const rs = [];
    for (let i of arr.slice(0, 3)) {
      const r = await table.findOne({ name: i });
      rs.push(r);
    }

    response = rs;
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});
app.listen(port, () => console.log(`app running on port ${port}`));
