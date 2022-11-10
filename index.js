import express, { query } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import { verifyJWT } from "./utils.js";
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

  try {
    const table = client.db("reviewSite-db").collection("services");
    response = limit
      ? await table
          .find()
          .limit(+limit)
          .sort({ index: 1 })
          .toArray()
      : perPageItem && currentPage
      ? await table
          .find()
          .skip(currentPage * perPageItem)
          .limit(+perPageItem)
          .sort({ index: 1 })
          .toArray()
      : await table.find().sort({ index: 1 }).toArray();

    count = await table.countDocuments();
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

    response = await table.find().limit(3).toArray();
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send(response);
  }
});
app.listen(port, () => console.log(`app running on port ${port}`));
