const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        // await client.connect();

        const userCollection = client.db('shipEaseDb').collection('users');
        const parcelCollection = client.db('shipEaseDb').collection('parcels');
        const reviewsCollection = client.db('shipEaseDb').collection('reviews');
        const paymentCollection = client.db('shipEaseDb').collection('payments');


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
                return res.status(403).send({ message: 'Forbidden access! deliverymen can only see this' })
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

        // for all role my profile
        app.get('/profileInfo/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        app.patch('/user/profileUpdate/:email', async (req, res) => {
            const email = req.params.email
            const profileData = req.body;
            const query = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: profileData
            }
            const result = await userCollection.updateOne(query, updateDoc)
            // const parcelResult = await parcelCollection.updateMany(query, updateDoc)
            // const reviewsResult = await reviewsCollection.updateMany(query, updateDoc)
            res.send({ result})
        })



        // Users Collection related apis
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            // console.log(userInfo)

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
                photo: userInfo?.photo,
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
            // console.log(query)
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
        app.patch('/parcels/update/:id', verifyToken, verifyUser, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: req.body
            }
            const result = await parcelCollection.updateOne(query, updated)
            res.send(result)
        })

        // update parcel Status by =>User (cancel)= he.she can only [RETURN]
        app.patch('/parcels/returned/:id', verifyToken, verifyUser, async (req, res) => {
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
        app.post('/parcels', verifyToken, verifyUser, async (req, res) => {
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

        app.post('/reviews', verifyToken, verifyUser, async (req, res) => {
            const review = req.body;
            const parcelId = review?.parcelId;
            // console.log('parcel id', parcelId)

            const reviewQuery = { _id: new ObjectId(parcelId) }
            const option = { upsert: true }

            const updateDoc = {
                $set: {
                    reviewStatus: 'done'
                }
            }
            const reviewsResult = await parcelCollection.updateOne(reviewQuery, updateDoc, option);
            const result = await reviewsCollection.insertOne(review);

            const query = { deliveryManId: review.deliveryManId }

            // console.log(query)
            // console.log(reviewQuery, 'reviews update', reviewsResult)
            res.send({ reviewsResult, result })
        })


        // __________________________Delivery Man___________________________________
        app.get('/myDelivery/:email', verifyToken, verifyDeliveryMen, async (req, res) => {
            const email = req.params.email;
            const userInfo = await userCollection.findOne({ email: email })
            const id = userInfo._id.toString()
            const myDeliveryList = await parcelCollection.find({ deliveryManId: id }).toArray()
            res.send(myDeliveryList);
        })

        // /parcels/bookingStatus/:id`
        // update parcel Status by =>DeliveryMen he can (delivered  or Canceled)

        app.patch('/parcels/bookingStatus/:id', verifyToken, verifyDeliveryMen, async (req, res) => {
            const { bookingStatus } = req.body;

            // console.log('new booking status: ', bookingStatus)

            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedStatus = {
                $set: {
                    bookingStatus: bookingStatus
                }
            }
            const result = await parcelCollection.updateOne(query, updatedStatus)
            res.send(result)
        })


        app.patch('/parcels/removeAssign/:id', verifyToken, verifyDeliveryMen, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    deliveryManId: ''
                }
            }
            const result = await parcelCollection.updateOne(query, updated)
            res.send(result)
        })

        app.get('/my-reviews/:email', verifyToken, verifyDeliveryMen, async (req, res) => {
            const email = req.params.email
            const deliveryMenDetails = await userCollection.findOne({ email: email })
            const id = deliveryMenDetails._id.toString()
            const result = await reviewsCollection.find({ deliveryManId: id }).toArray()
            // console.log('---', result)
            res.send(result)
        })



        // ------------------------------------ADMIN RELATED API's----------------------------------

        // all parcels(all parcel page)


        app.get('/parcels', verifyToken, verifyAdmin, async (req, res) => {
            const { fromDate, toDate } = req.query;
            let query = {};

            // If both dates are provided, filter by date range
            if (fromDate && toDate) {
                query = { requestedDeliveryDate: { $gte: fromDate, $lte: toDate } };
            }

            try {
                const result = await parcelCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error filtering data:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });



        // get one data date for testing
        app.get('/singleParcel', async (req, res) => {
            const query = { _id: new ObjectId('678e97b47ae79980b15bcf7a') };
            try {
                const result = await parcelCollection.findOne(query);

                const reqDate = new Date(result.requestedDeliveryDate);
                // console.log('From DB:', reqDate); 
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Error fetching single parcel" });
            }
        });



        // for all delivery man => name, phoneNo, deliveryCount, average review
        app.get('/deliveryPage', verifyToken, verifyAdmin, async (req, res) => {
            const query = { role: "DeliveryMen" }
            const delivers = await userCollection.find(query).toArray()
            let result = [];
            for (let man of delivers) {
                const id = man._id.toString()
                const deliveredQuery = { deliveryManId: id, bookingStatus: 'delivered' }
                const deliveredArray = await parcelCollection.find(deliveredQuery).toArray()

                const deliveryCount = deliveredArray?.length;
                // TO SO: AVERAGE REVIEW AFTER REVIEW BUTTON (MODAL)
                const reviewedQuery = { deliveryManId: id }
                const reviewedArray = await reviewsCollection.find(reviewedQuery).toArray()
                const reviewedCount = reviewedArray?.length;
                const reviewsSum = reviewedArray.reduce((sum, item) => sum + (item.rating || 0), 0);


                let reviewAverage = 0;
                if (reviewsSum > 0) {
                    reviewAverage = reviewsSum / reviewedCount;
                }

                // console.log('=========', reviewAverage)

                result.push({
                    id,
                    name: man.name,
                    phone: man.number,
                    deliveryCount,
                    reviewAverage
                })
            }
            res.send(result);
        })


        // for assign
        app.get('/assignDeliveryMan', verifyToken, verifyAdmin, async (req, res) => {
            const query = { role: "DeliveryMen" }
            const result = await userCollection.find(query).toArray()
            // console.log(result)
            res.send(result);
        })

        // assign Delivery man (by admin) update doc=> deliveryManId and Approximate delivery Date
        app.patch('/parcels/assign/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const assignData = req.body;
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    ...assignData,
                    bookingStatus: 'on the way'
                }
            }
            const result = await parcelCollection.updateOne(query, updated)
            res.send(result)
        })



        // all users(all users page)
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const email = req.decoded.email
            const ownerOfAdmin = { email: { $ne: email } }

            const users = await userCollection.find(ownerOfAdmin).skip(page * size).limit(size).toArray()

            let result = [];
            for (let user of users) {
                const emailQuery = { email: user?.email }
                const bookedByOneEmail = await parcelCollection.find(emailQuery).toArray();
                const parcelCostSum = bookedByOneEmail.reduce((sum, item) => sum + (item.price || 0), 0);

                const parcelBookedCount = bookedByOneEmail.length
                result.push({ ...user, parcelBookedCount, parcelCostSum })
            }
            res.send(result);
        })

        // Universal apis ----------------------------------------------------------------------
        // users count
        app.get('/userCount', async (req, res) => {
            const userCount = await userCollection.estimatedDocumentCount()
            res.send({ userCount });
        })
        app.get('/deliveredCount', async (req, res) => {
            const deliveredCount = await parcelCollection.countDocuments({ bookingStatus: 'delivered' });
            res.send({ deliveredCount });
        })
        app.get('/bookedCount', async (req, res) => {
            const bookedCount = await parcelCollection.estimatedDocumentCount()
            res.send({ bookedCount });
        })

        // user role change (update) by admin (admin)( all users page)
        app.patch('/users/:id', verifyToken, async (req, res) => {
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



        // Home Page

        // for top 3 delivery men => name, phoneNo, deliveryCount, average review
        app.get('/topDeliveryMen', async (req, res) => {
            const query = { role: "DeliveryMen" };  // Filter to get only delivery men
            const delivers = await userCollection.find(query).toArray(); // Get all delivery men

            let result = [];

            for (let man of delivers) {
                const id = man._id.toString();

                // Get the number of delivered parcels by the delivery man
                const deliveredQuery = { deliveryManId: id, bookingStatus: 'delivered' };
                const deliveredArray = await parcelCollection.find(deliveredQuery).toArray();
                const deliveryCount = deliveredArray.length;

                // Get reviews and calculate average rating
                const reviewedQuery = { deliveryManId: id };
                const reviewedArray = await reviewsCollection.find(reviewedQuery).toArray();
                const reviewedCount = reviewedArray.length;

                const reviewsSum = reviewedArray.reduce((sum, item) => sum + (item.rating || 0), 0);
                let reviewAverage = 0;

                if (reviewsSum > 0) {
                    reviewAverage = reviewsSum / reviewedCount;
                }

                // Push the data to result array
                result.push({
                    id,
                    name: man.name,
                    phone: man.number,
                    deliveryCount,
                    reviewAverage,
                    image: man?.photo
                });
            }

            // Sort by delivery count (descending) and then by average review
            const topDeliveryMen = result
                .sort((a, b) => {
                    if (b.deliveryCount !== a.deliveryCount) {
                        return b.deliveryCount - a.deliveryCount;
                    }
                    return b.reviewAverage - a.reviewAverage;
                })
                .slice(0, 3);

            // Send the result array as response
            res.send(topDeliveryMen);
        });


        //==============================================================================================================
        //                 Payments related api

        // get for knowing stripe payment time price
        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const singleData = await parcelCollection.findOne(query)
            res.send(singleData);
        })




        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const payAmount = req.body;
            const price = payAmount?.price

            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });

            res.send({ clientSecret: paymentIntent.client_secret })
        })


        // app.get('/payments/:email', verifyToken, async (req, res) => {
        //     const email = req.params.email;
        //     const query = { email }

        //     if (email !== req.decoded.email) {
        //         return res.status(403).send({ message: "forbidden access" })
        //     }

        //     const result = await paymentCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.post('/paymentDetails', verifyToken, async (req, res) => {
            const paymentInfo = req.body;
            const parcelId = paymentInfo.parcelId;

            const query = { _id: new ObjectId(parcelId) }
            const option = { upsert: true }

            const updateDoc = {
                $set: {
                    paymentStatus: 'paid'
                }
            }

            const updateResult = await parcelCollection.updateOne(query, updateDoc, option);
            const paymentResult = await paymentCollection.insertOne(paymentInfo);
            res.send({
                paymentResult,
                updateResult,
            })
        })



        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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