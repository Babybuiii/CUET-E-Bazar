const dns = require('dns');
// Use Google / Cloudflare public DNS to prevent ISP querySrv ECONNREFUSED issues on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const messageRoutes  = require('./routes/messages');
const shopRoutes     = require('./routes/shops');
const queryRoutes    = require('./routes/queries');
const cartRoutes     = require('./routes/cart');
const orderRoutes    = require('./routes/orders');
const giveawayRoutes = require('./routes/giveaways');

const { startGiveawayScheduler } = require('./jobs/giveawayScheduler');

const app      = express();
const PORT     = process.env.PORT || 5000;
const rawUri   = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '').trim();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/messages',  messageRoutes);
app.use('/api/shops',     shopRoutes);
app.use('/api/queries',   queryRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/giveaways', giveawayRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app:    'CUET e-bazar MERN API',
    time:   new Date().toISOString()
  });
});

// ── Connect to MongoDB, then start server + scheduler ─────────────────────────
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Database successfully.');
    try {
      const User = require('./models/User');
      await User.updateMany(
        { role: { $in: ['student', 'admin'] }, isVerified: false },
        { $set: { isVerified: true } }
      );
    } catch (migErr) {
      console.warn('Student verification sync warning:', migErr.message);
    }
    startGiveawayScheduler();
  })
  .catch((err) => {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    if (err.message.includes('Authentication failed') || err.message.includes('bad auth')) {
      console.error('💡 Tip: Verify database username & password in MongoDB Atlas -> Security -> Database Access, and ensure MONGO_URI in Render environment variables has no quotes or angle brackets.');
    }
  });

app.listen(PORT, () => {
  console.log(`🚀 CUET e-bazar MERN Server listening on http://localhost:${PORT}`);
});
