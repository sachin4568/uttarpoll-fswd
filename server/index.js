require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const Razorpay = require('razorpay');

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
  });
} catch (err) {
  console.error('Razorpay Initialization Error:', err);
}

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Auth scaffolding -> Auth Implementation
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isProfileComplete: user.isProfileComplete } });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isProfileComplete: user.isProfileComplete } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to protect routes
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = verified;
    
    // Fetch full user to check profile status
    const user = await prisma.user.findUnique({ where: { id: verified.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.fullUser = user;
    
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Profile Update
app.patch('/api/users/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, dob, occupation, aadhaar } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name,
        phone,
        address,
        dob: dob ? new Date(dob) : undefined,
        occupation,
        aadhaar,
        isProfileComplete: true
      }
    });
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        isProfileComplete: user.isProfileComplete 
      } 
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Phone or Aadhaar already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ride Management
app.get('/api/rides', async (req, res) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { 
        status: 'ACTIVE',
        capacity: { gt: 0 }
      },
      include: { host: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/rides', auth, async (req, res) => {
  try {
    const { fromLocation, toLocation, departureTime, price, capacity, checkpoints, specifications } = req.body;
    
    // Check profile completion
    if (!req.fullUser.isProfileComplete) {
      return res.status(403).json({ error: 'Please complete your profile to offer rides' });
    }

    // Check age (20+)
    if (req.fullUser.dob) {
      const birthDate = new Date(req.fullUser.dob);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      if (age < 20) {
        return res.status(403).json({ error: 'You must be at least 20 years old to offer rides' });
      }
    } else {
      return res.status(403).json({ error: 'Date of birth required' });
    }

    const ride = await prisma.ride.create({
      data: {
        hostId: req.user.userId,
        fromLocation,
        toLocation,
        departureTime: new Date(departureTime),
        price: parseFloat(price),
        capacity: parseInt(capacity),
        checkpoints: checkpoints || [],
        specifications: specifications || []
      }
    });
    
    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/rides/:id/end', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const rideId = parseInt(id);

    if (isNaN(rideId)) {
      return res.status(400).json({ error: 'Invalid ride ID format' });
    }
    
    // Verify ownership
    const ride = await prisma.ride.findUnique({
      where: { id: rideId }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.hostId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to end this ride' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'COMPLETED' }
    });

    console.log(`Ride ${rideId} successfully ended by User ${req.user.userId}`);
    
    // Settlement Logic: Credit Host Wallet for all PAID bookings
    const paidBookings = await prisma.booking.findMany({
      where: { rideId: rideId, status: 'PAID' }
    });

    let totalToCredit = 0;
    for (const b of paidBookings) {
      totalToCredit += (b.seatsRequested * ride.price);
    }

    if (totalToCredit > 0) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          walletBalance: { increment: totalToCredit },
          totalEarnings: { increment: totalToCredit }
        }
      });

      await prisma.transaction.create({
        data: {
          userId: req.user.userId,
          amount: totalToCredit,
          type: 'CREDIT',
          status: 'COMPLETED',
          reference: `Ride #${rideId} Earnings`
        }
      });
      console.log(`Credited ₹${totalToCredit} to User ${req.user.userId} for Ride ${rideId}`);
    }

    res.json({ success: true, ride: updatedRide, credited: totalToCredit });
  } catch (err) {
    console.error('End Ride Error Detail:', err);
    res.status(500).json({ error: 'Internal server error during ride completion' });
  }
});

// SOS Trigger
app.post('/api/rides/:id/sos', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const rideId = parseInt(id);

    // Verify if the user is the host or a passenger with an accepted booking
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: { where: { passengerId: req.user.userId, status: 'ACCEPTED' } } }
    });

    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    const isHost = ride.hostId === req.user.userId;
    const isAcceptedPassenger = ride.bookings.length > 0;

    if (!isHost && !isAcceptedPassenger) {
      return res.status(403).json({ error: 'Unauthorized to trigger SOS for this ride' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: { 
        isEmergency: true,
        sosTriggeredBy: req.user.userId
      }
    });

    console.log(`!!! SOS TRIGGERED !!! Ride: ${rideId}, User: ${req.user.userId} (${req.user.email})`);
    res.json({ success: true, message: 'Emergency services alerted (Mock)', ride: updatedRide });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ride History (Hosted + Joined)
app.get('/api/rides/history', auth, async (req, res) => {
  try {
    const hosted = await prisma.ride.findMany({
      where: { hostId: req.user.userId, status: 'COMPLETED' },
      include: { host: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const joined = await prisma.ride.findMany({
      where: {
        bookings: {
          some: {
            passengerId: req.user.userId,
            status: { in: ['ACCEPTED', 'PAID'] }
          }
        },
        status: 'COMPLETED'
      },
      include: { host: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ hosted, joined });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Booking Management
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { rideId, seatsRequested, pickupLocation } = req.body;
    
    // Check profile completion
    if (!req.fullUser.isProfileComplete) {
      return res.status(403).json({ error: 'Please complete your profile to book rides' });
    }

    // Check if ride exists
    const ride = await prisma.ride.findUnique({ where: { id: parseInt(rideId) } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    // Check capacity
    const requested = parseInt(seatsRequested) || 1;
    if (ride.capacity < requested) {
      return res.status(400).json({ error: `Only ${ride.capacity} seats available` });
    }

    // Check for existing booking
    const existing = await prisma.booking.findFirst({
      where: {
        rideId: parseInt(rideId),
        passengerId: req.user.userId,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending or active booking for this ride' });
    }

    // Prevent host from booking their own ride
    if (ride.hostId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot book your own ride' });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        rideId: parseInt(rideId),
        passengerId: req.user.userId,
        seatsRequested: requested,
        pickupLocation: pickupLocation || "Not specified",
        status: 'PENDING'
      }
    });
    
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// For Host to see incoming requests
app.get('/api/bookings/host', auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        ride: { hostId: req.user.userId }
      },
      include: {
        ride: true,
        passenger: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For Host to accept/reject booking
app.patch('/api/bookings/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'REJECTED'
    
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify host ownership of the ride associated with this booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { ride: true }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.ride.hostId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this booking' });
    }

    // If accepting, decrement capacity
    if (status === 'ACCEPTED') {
      if (booking.ride.capacity < booking.seatsRequested) {
        return res.status(400).json({ error: 'Not enough seats left on this ride' });
      }

      await prisma.ride.update({
        where: { id: booking.rideId },
        data: { capacity: { decrement: booking.seatsRequested } }
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For passenger to see their outgoing requests
app.get('/api/bookings/passenger', auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { passengerId: req.user.userId },
      include: {
        ride: { include: { host: { select: { name: true, upiId: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Wallet & Payments
app.get('/api/wallet', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } }
    });
    res.json({
      balance: user.walletBalance,
      totalEarnings: user.totalEarnings,
      upiId: user.payoutUPI || user.upiId,
      transactions: user.transactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/wallet/payout-setup', auth, async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ error: 'UPI ID is required' });
    
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { payoutUPI: upiId, upiId: upiId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/payments/order', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { ride: true }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const ridePrice = booking.ride.price * booking.seatsRequested;
    const platformFee = Math.max(25, Math.round(ridePrice * 0.05)); // 5% or 25 min
    const totalAmount = ridePrice + platformFee;

    const options = {
      amount: totalAmount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `receipt_booking_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      ...order,
      ridePrice,
      platformFee,
      totalAmount
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verification of payment (Mock for now, normally would use webhook or verify signature)
app.post('/api/payments/verify', auth, async (req, res) => {
  try {
    const { bookingId, razorpayPaymentId } = req.body;
    
    // In production, verify the Razorpay signature here!
    
    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: { status: 'PAID' }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
