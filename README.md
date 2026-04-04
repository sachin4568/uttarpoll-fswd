# Uttarpool — Himalayan Carpooling Platform

> A full-stack carpooling web application designed specifically for hilly and mountainous regions of Uttarakhand, India. Uttarpool connects drivers heading through mountain roads with passengers looking for affordable, safe rides between hill towns.

[![Live Demo](https://img.shields.io/badge/Live-uttarpoll--fswd.vercel.app-00C853?style=for-the-badge&logo=vercel)](https://uttarpoll-fswd.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20Prisma%20%7C%20PostgreSQL-blue?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-ISC-yellow?style=for-the-badge)]()

---

## Screenshots

| Dashboard                                          | Ride Details                                | Signup                        |
| -------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| Premium glassmorphism UI with gradient backgrounds | Vertical timeline showing route checkpoints | Secure auth with JWT sessions |

---

## Features

### For Drivers (Hosts)

- **Publish Rides** — Set source, destination, checkpoints, departure time, price, and seat capacity
- **Manage Requests** — Accept or reject passenger booking requests in real-time
- **End Trip & Auto-Settlement** — Complete rides and automatically receive earnings in wallet
- **UPI QR Payments** — Generate QR codes for cash/UPI passengers

### For Passengers

- **Smart Search** — Find rides matching your route, including intermediate checkpoint matches
- **Seat Booking** — Request seats with custom pickup locations
- **Online Payments** — Pay securely via Razorpay integration
- **Track Bookings** — Monitor booking status (Pending → Accepted → Paid)

### Safety & Security

- **SOS Emergency Button** — One-tap emergency alert system during rides
- **Profile Verification** — Aadhaar-based identity verification before booking
- **Age Restriction** — Minimum 20 years of age to host rides
- **JWT Authentication** — Secure session management with 7-day token expiry

### Financial

- **Digital Wallet** — Track earnings, payouts, and transaction history
- **Platform Fee Model** — 5% commission (minimum ₹25) per booking
- **Dual Payment Modes** — Online (Razorpay) and Cash/UPI at pickup

### UI/UX

- **Glassmorphism Design** — Modern frosted-glass card aesthetics
- **Dark/Light Theme** — System-aware theme toggle
- **Responsive Layout** — Works seamlessly on mobile and desktop
- **Micro-animations** — Smooth transitions and loading states
- **Google Fonts** — Inter + Outfit typography for premium feel

---

## Tech Stack

| Layer        | Technology                     | Purpose                                         |
| ------------ | ------------------------------ | ----------------------------------------------- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | UI structure, styling, and interactivity        |
| **Bundler**  | Vite 8                         | Fast dev server and optimized production builds |
| **Backend**  | Node.js + Express 5            | RESTful API server                              |
| **ORM**      | Prisma 6                       | Type-safe database queries and migrations       |
| **Database** | PostgreSQL (Neon.tech)         | Cloud-hosted relational database                |
| **Auth**     | JWT + bcryptjs                 | Stateless authentication and password hashing   |
| **Payments** | Razorpay Checkout              | Online payment processing                       |
| **Icons**    | Feather Icons                  | Lightweight SVG icon library                    |
| **Hosting**  | Vercel                         | Serverless deployment (Frontend + API)          |

---

## Project Structure

```
uttarpool/
├── index.html              # Main SPA entry point (all views)
├── main.js                 # Core application logic (auth, rides, bookings)
├── style.css               # Global styles and theme variables
├── dashboard.css           # Dashboard-specific layouts
├── vite.config.js          # Vite configuration with API proxy
├── vercel.json             # Vercel deployment routing rules
├── package.json            # Frontend dependencies
│
├── public/                 # Static assets (copied to dist/)
│   ├── payments.js         # Razorpay payment integration
│   ├── favicon.svg         # App icon
│   └── icons.svg           # SVG sprite sheet
│
└── server/                 # Backend API
    ├── index.js            # Express server with all API routes
    ├── package.json        # Server dependencies
    └── prisma/
        └── schema.prisma   # Database schema (User, Ride, Booking, Transaction)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud via [Neon.tech](https://neon.tech))

### 1. Clone the Repository

```bash
git clone https://github.com/sachin4568/uttarpoll-fswd.git
cd uttarpoll-fswd
```

### 2. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install
```

### 3. Configure Environment

Create a `.env` file in the **root** directory:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your-random-secret-key-here
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
PORT=3000
```

### 4. Setup Database

```bash
npx prisma@6 db push --schema=./server/prisma/schema.prisma
```

### 5. Run Development Server

```bash
# Terminal 1: Frontend (Vite)
npm run dev

# Terminal 2: Backend (Express)
cd server && node index.js
```

The app will be available at `http://localhost:5173` with the API proxied to `http://localhost:3000`.

---

## Deployment (Vercel)

1. Push code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel Dashboard → Settings → Environment Variables
4. Vercel auto-detects the build command from `package.json`
5. The `vercel.json` handles routing between frontend and serverless API

---

## Database Schema

```
User (1) ──── (N) Ride          → A user can host many rides
User (1) ──── (N) Booking       → A user can make many bookings
User (1) ──── (N) Transaction   → A user has many wallet transactions
Ride (1) ──── (N) Booking       → A ride can have many bookings
```

### Models

- **User** — name, email, password, phone, aadhaar, wallet, UPI
- **Ride** — source, destination, checkpoints, price, capacity, status, SOS
- **Booking** — seats, pickup location, payment method, status
- **Transaction** — amount, type (credit/debit), status, reference

---

## 🔑 API Endpoints

| Method | Endpoint                  | Auth | Description              |
| ------ | ------------------------- | ---- | ------------------------ |
| POST   | `/api/auth/register`      | ❌   | Create new account       |
| POST   | `/api/auth/login`         | ❌   | Login and get JWT        |
| GET    | `/api/auth/me`            | ✅   | Get current user         |
| PATCH  | `/api/users/profile`      | ✅   | Update profile           |
| GET    | `/api/rides`              | ❌   | List active rides        |
| POST   | `/api/rides`              | ✅   | Create/publish a ride    |
| PATCH  | `/api/rides/:id/end`      | ✅   | End a ride + auto-settle |
| POST   | `/api/rides/:id/sos`      | ✅   | Trigger SOS emergency    |
| GET    | `/api/rides/history`      | ✅   | Get completed rides      |
| POST   | `/api/bookings`           | ✅   | Request to join a ride   |
| GET    | `/api/bookings/host`      | ✅   | View incoming requests   |
| GET    | `/api/bookings/passenger` | ✅   | View outgoing requests   |
| PATCH  | `/api/bookings/:id`       | ✅   | Accept/reject a booking  |
| GET    | `/api/wallet`             | ✅   | Get wallet balance       |
| POST   | `/api/payments/order`     | ✅   | Create Razorpay order    |
| POST   | `/api/payments/verify`    | ✅   | Verify payment           |

---

## Author

**Sachin Chaubey**

- GitHub: [@sachin4568](https://github.com/sachin4568)

---

## License

This project is licensed under the ISC License.

---

## Acknowledgments

- [Neon.tech](https://neon.tech) — Serverless PostgreSQL
- [Prisma](https://prisma.io) — Next-generation ORM
- [Vercel](https://vercel.com) — Serverless hosting
- [Feather Icons](https://feathericons.com) — Beautiful open-source icons
- [Razorpay](https://razorpay.com) — Payment gateway
