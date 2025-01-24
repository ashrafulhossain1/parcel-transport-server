# Cureer Transportation Backend

This is the backend for the ShipEase application, which facilitates user parcel bookings, delivery management, and review systems. The backend is built using Node.js, Express, MongoDB, and Stripe for payment processing.

---

## Table of Contents

- [Technologies Used](#technologies-used)
- [Environment Setup](#environment-setup)
- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Middleware](#middleware)

---

## Technologies Used

- **Node.js**
- **Express.js**
- **MongoDB** (via `mongodb` library)
- **JWT** (JSON Web Token for authentication)
- **Stripe** (for payment processing)
- **Cors** (for cross-origin resource sharing)

---

## Environment Setup

Before running the project, ensure you have the following installed:

- Node.js (version 16 or higher recommended)
- MongoDB database (local or cloud)
- Stripe API keys

---

## Features

1. **Authentication and Authorization:**
   - JSON Web Tokens (JWT) for secure authentication.
   - Role-based access control for Users, Delivery Personnel, and Admins.

2. **Parcel Management:**
   - Users can book parcels and update their parcel information.
   - Delivery personnel can manage assigned parcels.

3. **Review System:**
   - Users can submit reviews for delivery personnel.

4. **Profile Management:**
   - Update user profiles.

5. **Payment Processing:**
   - Integration with Stripe for secure payments.

---

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the required environment variables (see [Environment Variables](#environment-variables)).

4. Start the server:

   ```bash
   npm run start
   ```

5. The server should be running on `http://localhost:5000` (or the specified `PORT`).

---

## Environment Variables

Create a `.env` file and include the following variables:

```env
PORT=5000
DB_USER=<your-mongodb-username>
DB_PASS=<your-mongodb-password>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
ACCESS_TOKEN_SECRET=<your-jwt-secret-key>
```

---

## API Endpoints

### Authentication

| Method | Endpoint     | Description                      |
|--------|--------------|----------------------------------|
| POST   | `/jwt`       | Generate JWT for authentication |

### User Management

| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| POST   | `/users`                   | Register a new user                     |
| GET    | `/users/role/:email`       | Get user role                           |
| GET    | `/profileInfo/:email`      | Get user profile information            |
| PATCH  | `/user/profileUpdate/:email` | Update user profile information       |

### Parcel Management

| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| GET    | `/parcels/:email`          | Get all parcels for a user              |
| POST   | `/parcels`                 | Create a new parcel                     |
| GET    | `/parcels/update/:id`      | Get parcel information for updating     |
| PATCH  | `/parcels/update/:id`      | Update a specific parcel                |
| PATCH  | `/parcels/returned/:id`    | Mark a parcel as returned               |

### Reviews

| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| POST   | `/reviews`                 | Submit a review                         |
| GET    | `/my-reviews/:email`       | Get all reviews for a user              |

### Delivery Management

| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| GET    | `/myDelivery/:email`       | Get deliveries assigned to personnel    |
| PATCH  | `/parcels/bookingStatus/:id` | Update parcel booking status          |
| PATCH  | `/parcels/removeAssign/:id` | Remove assigned delivery personnel     |

---

## Middleware

### JWT Verification

1. **Verify Token**: Ensures a valid JWT is provided in the `Authorization` header.
2. **Role Verification**:
   - `verifyUser`: Restricts access to users with the `User` role.
   - `verifyDeliveryMen`: Restricts access to users with the `DeliveryMen` role.
   - `verifyAdmin`: Restricts access to users with the `Admin` role.

---

## Notes

1. Replace `<repository-url>` with your actual repository URL.
2. Ensure the `.env` file is included in your `.gitignore` to prevent sensitive data from being pushed to the repository.

---

## License

This project is licensed under the MIT License.
