import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
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
app.get("/services", async (req, res) => {
  let response;
  let count;
  const limit = req.query.limit;

  const perPageItem = req.query.perPageItem;
  const currentPage = req.query.currentPage;
  console.log(perPageItem, currentPage);

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
  console.log(req.params.id);
  const idToFind = req.params.id;
  let response;
  try {
    const table = client.db("reviewSite-db").collection("services");
    const query = { _id: ObjectId(idToFind) };
    response = await table.findOne(query);
  } catch (err) {
    response = { message: err.message };
  } finally {
    console.log(response);
    res.send(response);
  }
});

app.listen(port, () => console.log(`app running on port ${port}`));
