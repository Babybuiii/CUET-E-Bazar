const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '').trim();

const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@cuet-ebazar.com';
const adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@CUET2026';
const adminName = process.argv[4] || 'System Administrator';

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const normalizedEmail = adminEmail.toLowerCase().trim();
    let admin = await User.findOne({ email: normalizedEmail });

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (admin) {
      console.log(`Found existing user with email ${normalizedEmail}. Updating to admin role and password...`);
      admin.role = 'admin';
      admin.fullName = adminName;
      admin.passwordHash = passwordHash;
      admin.isVerified = true;
      admin.isBanned = false;
      admin.isSuspended = false;
      await admin.save();
      console.log(`✅ Admin updated successfully: ${normalizedEmail}`);
    } else {
      console.log(`Creating new admin account: ${normalizedEmail}...`);
      admin = await User.create({
        fullName: adminName,
        email: normalizedEmail,
        contactNumber: '01800000000',
        passwordHash,
        role: 'admin',
        isVerified: true,
        isBanned: false,
        isSuspended: false
      });
      console.log(`✅ Admin created successfully: ${normalizedEmail} (ID: ${admin._id})`);
    }

    console.log('----------------------------------------------------');
    console.log('Admin credentials ready:');
    console.log(`Email:    ${normalizedEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
}

seedAdmin();

