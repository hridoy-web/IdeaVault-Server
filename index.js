const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j6a6juf.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Request logger
const logger = (req, res, next) => {
    console.log(`${req.method} | ${req.url}`);
    next();
};

// Token verification middleware
const verifyToken = async (req, res, next) => {
    const { authorization } = req.headers;
    const token = authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("ideaVaultDB");
        const ideasCollection = db.collection("ideas");
        const commentsCollection = db.collection("comments");

        // Routes
        app.get('/ideas', async (req, res) => {
            const { search, category } = req.query;
            let query = {};

            if (search) query.ideaTitle = { $regex: search, $options: 'i' };
            if (category && category !== 'All') query.category = category;

            const result = await ideasCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.get("/trending-ideas", async (req, res) => {
            const result = await ideasCollection.find().limit(6).toArray();
            res.send(result);
        });

        app.get('/ideas/:ideasId', logger, verifyToken, async (req, res) => {
            const { ideasId } = req.params;
            const result = await ideasCollection.findOne({ _id: new ObjectId(ideasId) });
            res.send(result);
        });

        app.post('/add-ideas', async (req, res) => {
            try {
                const result = await ideasCollection.insertOne(req.body);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        app.get('/my-ideas', async (req, res) => {
            try {
                const result = await ideasCollection.find({ userEmail: req.query.email }).sort({ _id: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        app.patch('/update-idea/:id', async (req, res) => {
            try {
                const result = await ideasCollection.updateOne(
                    { _id: new ObjectId(req.params.id) },
                    { $set: req.body }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        app.delete('/delete-idea/:id', async (req, res) => {
            try {
                const result = await ideasCollection.deleteOne({ _id: new ObjectId(req.params.id) });
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

      // Comments routes 
app.post("/comments", async (req, res) => {
    try {
        const { ideaId, userName, userEmail, userImage, text, createdAt } = req.body;
        const commentToSave = {
            ideaId,
            userName,
            userEmail,
            userImage,
            text: typeof text === 'object' ? text.text || "" : text,
            createdAt
        };

        const result = await commentsCollection.insertOne(commentToSave);
        res.send({ success: true, insertedId: result.insertedId });
    } catch (error) {
        res.status(500).send({ success: false, message: "Failed to add comment" });
    }
});

        app.get("/comments/:ideaId", async (req, res) => {
            try {
                const result = await commentsCollection.find({ ideaId: req.params.ideaId }).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: "Failed to fetch comments" });
            }
        });

        app.patch("/comments/:id", async (req, res) => {
            try {
                const result = await commentsCollection.updateOne(
                    { _id: new ObjectId(req.params.id) },
                    { $set: { text: req.body.text } }
                );
                res.send({ success: true, result });
            } catch (error) {
                res.status(500).send({ success: false, message: "Failed to update comment" });
            }
        });

        app.delete("/comments/:id", async (req, res) => {
            try {
                const result = await commentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
                res.send({ success: true, result });
            } catch (error) {
                res.status(500).send({ success: false, message: "Failed to delete comment" });
            }
        });

        // my interactions page 
        app.get("/my-interactions", async (req, res) => {
            try {
                const email = req.query.email;
                const query = { userEmail: email };
                const result = await commentsCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch interactions" });
            }
        });

    } finally {
       
    }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('IdeaVault Server is running'));

app.listen(port, () => console.log(`Server running on port ${port}`));