require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const messageRoutes = require('./routes/messages');
const shopRoutes = require('./routes/shops');
const notificationRoutes = require('./routes/notifications');
const orderRoutes = require('./routes/orders');
const queryRoutes = require('./routes/queries');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/queries', queryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'CUET e-bazar MERN API',
    time: new Date().toISOString()
  });
});

// Connect to MongoDB if available, otherwise run HTTP server with fallback
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Database successfully.'))
  .catch((err) => console.log(`❌ MongoDB Connection Error: ${err.message}`));

app.listen(PORT, () => {
  console.log(`🚀 CUET e-bazar MERN Server listening on http://localhost:${PORT}`);
});
