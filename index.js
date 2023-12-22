const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5005;

// middleware
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // connect to the database & access it's collections
    const database = client.db("sync-task");
    const usersCollection = database.collection("users");
    const tasksCollection = database.collection("tasks");

    // user related API (usersCollection)
    // add new user credentials to the db
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        // query to find all users in the collection
        const query = await usersCollection.find().toArray();
        // check if there already exist an user
        const found = query.find(
          (search) => search.name === user.name && search.email === user.email
        );
        if (found) {
          return res.send({ message: "Already exists" });
        }
        const result = await usersCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        console.log(error);
        return res.send({ error: true, message: error.message });
      }
    });

    // get own task from collection
    app.get("/tasks/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;

        const toDo = await tasksCollection
          .find({
            added_by_email: userEmail,
            status: "to-do",
          })
          .toArray();

        const onGoing = await tasksCollection
          .find({
            added_by_email: userEmail,
            status: "ongoing",
          })
          .toArray();

        const completed = await tasksCollection
          .find({
            added_by_email: userEmail,
            status: "completed",
          })
          .toArray();

        res.status(200).send({ toDo, onGoing, completed });
      } catch (error) {
        console.error(error);
        return res.status(500).send({ error: true, message: error.message });
      }
    });

    // add task to collection
    app.post("/tasks", async (req, res) => {
      try {
        const task = req.body;
        // query to find if a task with the same attributes already exists
        const existingTask = await tasksCollection.findOne({
          task_title: task.task_title,
          description: task.description,
          added_by_email: task.added_by_email,
        });
        if (existingTask) {
          return res.send({ message: "Already exists" });
        }
        // Create a new task
        const result = await tasksCollection.insertOne(task);
        res.status(201).send(result);
      } catch (error) {
        console.log(error);
        return res.send({ error: true, message: error.message });
      }
    });

    // update task status by DnD
    app.patch("/tasks/:id", async (req, res) => {
      try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await tasksCollection.updateOne(query, {
          $set: req.body,
        });
        res.send(result);
      } catch (error) {
        console.log(error);
        return res.send({ error: true, message: error.message });
      }
    });

    // delete a task
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await tasksCollection.deleteOne(query);
        res.status(203).send(result);
      } catch (error) {
        console.log(error);
        return res.send({ error: true, message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
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

app.get("/", (req, res) => {
  res.send("SyncTask server is running!");
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
