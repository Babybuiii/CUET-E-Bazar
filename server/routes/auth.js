const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { CUET_DEPARTMENTS, CUET_HALLS } = require('../models/User');
const Shop = require('../models/Shop');
const { uploadAvatar, isCloudinaryConfigured } = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cuet_ebazar_key_2026';

// ── Helper: sanitize user for API response ──────────────────────────────────
const formatUser = (user, shop = null) => ({
  _id: user._id,
  userId: user.userId,
  fullName: user.fullName,
  studentId: user.studentId || '',
  email: user.email,
  department: user.department || '',
  hall: user.hall || '',
  contactNumber: user.contactNumber,
  role: user.role,
  shop: shop || user.shop || null,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  rating: user.rating,
  totalReviewsReceived: user.totalReviewsReceived,
  totalProductsSold: user.totalProductsSold,
  totalProductsBought: user.totalProductsBought,
  totalGiveaways: user.totalGiveaways,
  isVerified: user.isVerified,
  isBanned: user.isBanned,
  lastActive: user.lastActive,
  createdAt: user.createdAt
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const {
      role = 'student',
      fullName,
      email,
      contactNumber,
      password,
      // Student specific
      studentId,
      department,
      hall,
      // Shop Owner specific
      shopName,
      shopCategory,
      shopDescription,
      shopLocation,
      operatingHours
    } = req.body;

    const userRole = role === 'shop_owner' ? 'shop_owner' : 'student';

    // ── Common required fields check ──────────────────────────────────────────
    if (!fullName || !email || !contactNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, contact number, and password are required.'
      });
    }

    // ── Check duplicate email ────────────────────────────────────────────────
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    let createdShop = null;

    // ── 1. STUDENT REGISTRATION ──────────────────────────────────────────────
    if (userRole === 'student') {
      if (!studentId || !department || !hall) {
        return res.status(400).json({
          success: false,
          message: 'Student ID, department, and hall are required for student accounts.'
        });
      }

      if (!/^[^\s@]+@[^\s@]*cuet\.ac\.bd$/i.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Student email must be a valid CUET email ending with .cuet.ac.bd'
        });
      }

      if (!/^\d{7}$/.test(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Student ID must be exactly 7 digits (e.g. 2204120)'
        });
      }

      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        return res.status(400).json({ success: false, message: 'An account with this Student ID already exists.' });
      }
    }

    // ── 2. SHOP OWNER REGISTRATION ───────────────────────────────────────────
    if (userRole === 'shop_owner') {
      if (!shopName || !shopName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Shop name is required for shop owner registration.'
        });
      }

      const existingShop = await Shop.findOne({
        shopName: { $regex: new RegExp(`^${shopName.trim()}$`, 'i') }
      });
      if (existingShop) {
        return res.status(400).json({
          success: false,
          message: 'A shop with this name already exists. Please choose a different name.'
        });
      }
    }

    // ── Hash password ────────────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ── Create user document ─────────────────────────────────────────────────
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      contactNumber: contactNumber.trim(),
      passwordHash,
      role: userRole,
      studentId: userRole === 'student' ? studentId.trim() : undefined,
      department: userRole === 'student' ? department : '',
      hall: userRole === 'student' ? hall : ''
    });

    // ── If Shop Owner, create the Shop document and link it ───────────────────
    if (userRole === 'shop_owner') {
      createdShop = await Shop.create({
        shopName: shopName.trim(),
        owner: user._id,
        category: shopCategory || 'General Store',
        description: shopDescription || '',
        location: shopLocation || 'CUET Campus',
        contactNumber: contactNumber.trim(),
        email: email.toLowerCase().trim(),
        operatingHours: operatingHours || { open: '09:00', close: '21:00' }
      });

      user.shop = createdShop._id;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: userRole === 'shop_owner'
        ? 'Shop Owner account and campus shop created successfully!'
        : 'Registration successful! Welcome to CUET E-bazar.',
      token,
      user: formatUser(user, createdShop)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been banned. Reason: ${user.banReason || 'Contact admin for details.'}`
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/me', authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: formatUser(req.user)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/constants
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/constants', (req, res) => {
  return res.json({
    success: true,
    departments: CUET_DEPARTMENTS,
    halls: CUET_HALLS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/profile - Update user profile
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, bio, contactNumber, department, hall, avatarUrl } = req.body;
    const user = req.user;

    if (fullName !== undefined) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
      }
      user.fullName = fullName.trim();
    }

    if (bio !== undefined) {
      if (bio.length > 300) {
        return res.status(400).json({ success: false, message: 'Bio cannot exceed 300 characters.' });
      }
      user.bio = bio.trim();
    }

    if (contactNumber !== undefined) {
      if (!/^(\+?880|0)1[3-9]\d{8}$/.test(contactNumber.trim())) {
        return res.status(400).json({ success: false, message: 'Please provide a valid Bangladeshi phone number.' });
      }
      user.contactNumber = contactNumber.trim();
    }

    if (department !== undefined) {
      if (department && !CUET_DEPARTMENTS.includes(department)) {
        return res.status(400).json({ success: false, message: 'Invalid CUET department selected.' });
      }
      user.department = department;
    }

    if (hall !== undefined) {
      if (hall && !CUET_HALLS.includes(hall)) {
        return res.status(400).json({ success: false, message: 'Invalid CUET hall selected.' });
      }
      user.hall = hall;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: formatUser(user)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/avatar - Upload user avatar to Cloudinary
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/avatar', authenticate, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Avatar upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }

    try {
      let avatarUrl = '';
      if (req.file.path) {
        avatarUrl = req.file.path;
      } else if (req.file.buffer) {
        const b64 = req.file.buffer.toString('base64');
        avatarUrl = `data:${req.file.mimetype};base64,${b64}`;
      }

      req.user.avatarUrl = avatarUrl;
      await req.user.save();

      return res.json({
        success: true,
        message: 'Profile picture updated successfully!',
        avatarUrl,
        user: formatUser(req.user)
      });
    } catch (saveErr) {
      console.error('Avatar save error:', saveErr);
      return res.status(500).json({ success: false, message: 'Could not save uploaded avatar.' });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/password - Change password
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'The current password you entered is incorrect.'
      });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    req.user.passwordHash = await bcrypt.hash(newPassword, salt);
    await req.user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.'
    });
  }
});

module.exports = router;

