// step: 1
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

//step: 2
const app = express();
const port = process.env.PORT || 5000;

// step: 3 - midleware setup
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j6a6juf.mongodb.net/?appName=Cluster0`

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = (req, res, next) => {
    console.log(`${req.method} | ${req.url}`);
    next();
}

const verifyToken = async (req, res, next) => {
    const { authorization } = req.headers;
    // console.log(req.headers, "from verify token");
    next();
}

async function run() {
    try {

        await client.connect();

        // database connection
        const db = client.db("ideaVaultDB");
        const ideasCollection = db.collection("ideas");

        // ideas section get route
        app.get('/ideas', async (req, res) => {
            const cursor = ideasCollection.find();
            const result = await ideasCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        })

        // home page trending section 6 data 
        app.get("/trending-ideas", async (req, res) => {
            const cursor = ideasCollection.find().limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        // ideas single (id) data
        app.get('/ideas/:ideasId', logger, verifyToken, async (req, res) => {
            const { ideasId } = req.params;
            // console.log(ideasId);
            const query = { _id: new ObjectId(ideasId) }
            const result = await ideasCollection.findOne(query);
            res.send(result)
        })

        app.post('/add-ideas', async (req, res) => {
            try {
                const destinationData = req.body;
                // console.log(destinationData);
                const result = await ideasCollection.insertOne(destinationData);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

// 
app.get('/', (req, res) => {
    res.send('IdeaVault Server is running')
})

// server listening 
app.listen(port, () => {
    console.log(`server is runing port ${port}`)
})