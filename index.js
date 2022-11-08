import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
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
          .toArray()
      : perPageItem && currentPage
      ? await table
          .find()
          .skip(currentPage * perPageItem)
          .limit(+perPageItem)
          .toArray()
      : await table.find().toArray();

    count = await table.countDocuments();
  } catch (err) {
    response = { message: err.message };
  } finally {
    res.send({ response, count });
  }
});

app.listen(port, () => console.log(`app running on port ${port}`));
