const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jkfsd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server
        await client.connect();

        const userCollection = client.db('shipEaseDb').collection('users');
        const parcelCollection = client.db('shipEaseDb').collection('parcels');

        //_______________________________ JWT Token Create_______________________________________________
        // create token
        app.post('/jwt', async (req, res) => {
            const userInfo = req.body
            const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '5h'
            })
            res.send({ token });
        })

        // verify token
        const verifyToken = (req, res, next) => {
            // console.log(req.headers?.authentication)

            if (!req.headers.authentication) {
                return res.status(401).send({ message: 'unauthorized Access DGM-1' });
            }

            const token = req.headers.authentication.split(' ')[1];
            // console.log(token)
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'Invalid Token DGM-2...' })
                }
                req.decoded = decoded;
                next()
            })
        }

        //====================================== verify User ================================================
        const verifyUser = async (req, res, next) => {
            const email = req.decoded?.email
            // console.log('From verify User', email)

            const query = { email }
            const user = await userCollection.findOne(query)
            if (user?.role !== 'User') {
                return res.status(403).send({ message: 'Forbidden access! User can only see this' })
            }
            next()
        }
        // verify User
        const verifyDeliveryMen = async (req, res, next) => {
            const email = req.decoded?.email
            // console.log('From verify User', email)

            const query = { email }
            const user = await userCollection.findOne(query)
            if (user?.role !== 'DeliveryMen') {
                return res.status(403).send({ message: 'Forbidden access! User can only see this' })
            }
            next()
        }
        // verify User
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email
            // console.log('From verify User', email)

            const query = { email }
            const user = await userCollection.findOne(query)
            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden access! User can only see this' })
            }
            next()
        }
        // ______________________________________________jwt middleware end____________________________________________________

        // Users Collection related apis
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            console.log(userInfo)
            // insert email and name if user don't exist in database
            const query = { email: userInfo.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exist', existingUser })
            }
            // new user data add in userCollection
            const newUser = {
                name: userInfo.name,
                email: userInfo?.email,
                number: userInfo?.number || 'Not Available',
                role: userInfo?.role || 'User',
                parcelBooked: 0,
                parcel_delivered: 0,
                average_review: 0,
            }
            const result = await userCollection.insertOne(newUser)
            res.send(result)
        })

        // get user role
        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email
            const result = await userCollection.findOne({ email })
            res.send({ role: result?.role })
        })

        //USER PARCEL RELATED API's

        // specific user for all booked parcels by (her) email AND status wise
        app.get('/parcels/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const { bookingStatus } = req.query;

            let query = { email }
            if (bookingStatus) {
                query.bookingStatus = bookingStatus;
            }
            const result = await parcelCollection.find(query).toArray();
            res.send(result)
        })

        // single parcel get for update parcel default value in update page (updated parcelData by patch)
        app.get('/parcels/update/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await parcelCollection.findOne(query)
            res.send(result)
        })

        // updated parcelData by patch (single parcel get for update parcel default value in update page)
        app.patch('/parcels/update/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: req.body
            }
            const result = await parcelCollection.updateOne(query, updated)
            res.send(result)
        })

        // update parcel Status by =>User (cancel)
        app.patch('/parcels/returned/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedStatus = {
                $set: {
                    bookingStatus: 'returned'
                }
            }
            const result = await parcelCollection.updateOne(query, updatedStatus)
            res.send(result)
        })


        // post a parcel
        app.post('/parcels', verifyToken, async (req, res) => {
            const parcel = req.body;
            const parcelInfo = {
                ...parcel,
                approximateDeliveryDate: '',
                deliveryManId: '',
                bookingStatus: 'pending'
            }
            const result = await parcelCollection.insertOne(parcelInfo)
            res.send(result)
        })

        // ------------------------------------ADMIN RELATED API's----------------------------------

        // all parcels
        app.get('/parcels', verifyToken, verifyAdmin, async (req, res) => {
            const result = await parcelCollection.find().toArray()
            res.send(result)
        })


        // all users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const users = await userCollection.find().toArray()

            let result = [];
            for (let user of users) {
                const emailQuery = { email: user?.email }
                const bookedByOneEmail = await parcelCollection.find(emailQuery).toArray();
                const parcelBookedCount = bookedByOneEmail.length
                result.push({ ...user, parcelBookedCount })
            }
            res.send(result);
        })

        // user role change (update) by admin (admin)
        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const { newRole } = req.body
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    role: newRole
                }
            }
            const result = await userCollection.updateOne(query, updated)
            res.send(result)
        })










        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('SHIP Ease Server is ready')
})

app.listen(port, () => {
    console.log(`SHip server is running port: ${port}`)
})