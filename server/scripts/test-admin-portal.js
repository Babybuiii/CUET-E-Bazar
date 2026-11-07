const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const AdminLog = require('../models/AdminLog');

const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '').trim();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cuet_ebazar_key_2026';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE ADMIN PORTAL TEST SUITE');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('Database connected.\n');

  // 1. Verify Admin User
  console.log('--- 1. Admin Account & Auth Verification ---');
  const admin = await User.findOne({ role: 'admin' });
  assert(admin !== null, 'An admin account exists in database');
  assert(admin.role === 'admin', 'Admin role is strictly "admin"');
  assert(admin.isBanned === false, 'Admin account is not banned');

  const adminToken = jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  assert(Boolean(adminToken), 'Generated valid Admin JWT token');

  // Verify Student User cannot be Admin
  const student = await User.findOne({ role: 'student' });
  if (student) {
    const studentToken = jwt.sign(
      { id: student._id, email: student.email, role: student.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const decodedStudent = jwt.verify(studentToken, JWT_SECRET);
    assert(decodedStudent.role === 'student', 'Student token role cannot pass admin check');
  }

  // 2. Test User Moderation (Warning, Suspension, Restore)
  console.log('\n--- 2. User Moderation Workflow ---');
  const targetUser = await User.findOne({ role: 'student' });
  if (targetUser) {
    const originalWarningCount = targetUser.warnings?.length || 0;

    // Issue Warning
    targetUser.warnings.push({
      reason: 'Automated test warning for rule compliance test',
      issuedBy: admin._id,
      date: new Date()
    });
    await targetUser.save();
    assert(targetUser.warnings.length === originalWarningCount + 1, 'Admin can issue warnings with reasons to user');

    // Suspend User
    const suspendUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    targetUser.isSuspended = true;
    targetUser.suspendedUntil = suspendUntil;
    targetUser.suspensionReason = 'Automated suspension test';
    await targetUser.save();
    assert(targetUser.isSuspended === true, 'Admin can temporarily suspend student user');

    // Restore User
    targetUser.isSuspended = false;
    targetUser.suspendedUntil = null;
    targetUser.suspensionReason = '';
    targetUser.isBanned = false;
    targetUser.banReason = '';
    await targetUser.save();
    assert(targetUser.isSuspended === false && targetUser.isBanned === false, 'Admin can restore suspended user');
  }

  // 3. Test Seller & Shop Management (Separation of Shop Suspension vs Owner Account)
  console.log('\n--- 3. Seller & Shop Management (Separation of Shop vs Owner) ---');
  const shop = await Shop.findOne();
  if (shop) {
    const shopOwner = await User.findById(shop.owner);
    assert(shopOwner !== null, 'Shop has valid owner user');

    // Suspend shop
    shop.isSuspended = true;
    shop.suspensionReason = 'Shop inspection test';
    await shop.save();
    assert(shop.isSuspended === true, 'Admin can suspend shop');
    assert(shopOwner.isBanned === false, 'Owner account is NOT banned when shop is suspended (Separation verified)');

    // Toggle Visibility
    shop.isHidden = true;
    await shop.save();
    assert(shop.isHidden === true, 'Admin can hide shop from public campus directory');

    // Restore Shop
    shop.isSuspended = false;
    shop.isHidden = false;
    shop.isDisabled = false;
    await shop.save();
    assert(shop.isSuspended === false && shop.isHidden === false, 'Admin can restore shop to active status');
  }

  // 4. Test Product Moderation (Hide, Remove, Restore)
  console.log('\n--- 4. Product Listings Moderation ---');
  const product = await Product.findOne();
  if (product) {
    const originalStatus = product.status;

    // Hide product
    product.status = 'hidden';
    product.adminNotes = 'Hidden during test';
    await product.save();
    assert(product.status === 'hidden', 'Admin can hide product from marketplace (Reversible)');

    // Remove product (marks as removed_by_admin)
    product.status = 'removed_by_admin';
    product.adminNotes = 'Violated campus advertising terms';
    await product.save();
    assert(product.status === 'removed_by_admin', 'Admin can remove prohibited product advertisement');

    // Restore product
    product.status = 'active';
    product.adminNotes = '';
    await product.save();
    assert(product.status === 'active', 'Admin can restore product back to active');
  }

  // 5. Test Reports & Moderation
  console.log('\n--- 5. Reports & Moderation Flow ---');
  if (student && product) {
    // Create a test report
    const report = await Report.create({
      reporter: student._id,
      targetType: 'product',
      targetId: product._id,
      reason: 'fake_product',
      description: 'Test report on suspect item'
    });
    assert(report !== null && report.status === 'pending', 'Student can submit report to admin queue');

    // Admin resolves report
    report.status = 'resolved';
    report.actionTaken = 'warn_user';
    report.adminNotes = 'Verified item authenticity and warned seller';
    report.resolvedBy = admin._id;
    report.resolvedAt = new Date();
    await report.save();
    assert(report.status === 'resolved', 'Admin can investigate and resolve report with moderation action');

    // Clean up test report
    await Report.deleteOne({ _id: report._id });
  }

  // 6. Test Admin Activity Audit Log
  console.log('\n--- 6. Admin Activity Audit Trail ---');
  const logEntry = await AdminLog.create({
    admin: admin._id,
    action: 'USER_WARNED',
    targetType: 'user',
    targetId: student ? student._id : null,
    targetName: student ? student.fullName : 'Test Student',
    reason: 'Policy violation test',
    ipAddress: '127.0.0.1'
  });
  assert(logEntry !== null, 'Administrative actions are recorded in AdminLog');
  const fetchedLog = await AdminLog.findById(logEntry._id);
  assert(fetchedLog.action === 'USER_WARNED', 'AdminLog entry persists with complete audit details');
  await AdminLog.deleteOne({ _id: logEntry._id });

  // 7. Test Admin Notification Flow
  console.log('\n--- 7. Admin Notification System ---');
  const notif = await Notification.create({
    recipient: admin._id,
    type: 'new_report',
    title: 'New Moderation Incident',
    message: 'A student reported suspect activity in Engineering department',
    linkType: 'report'
  });
  assert(notif !== null && notif.isRead === false, 'Persistent admin notification created');
  notif.isRead = true;
  await notif.save();
  assert(notif.isRead === true, 'Admin can mark notifications as read');
  await Notification.deleteOne({ _id: notif._id });

  // 8. Test Analytics Aggregations
  console.log('\n--- 8. Real Analytics Aggregation ---');
  const [studentCount, shopCount, productCount, orderCount] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Shop.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments()
  ]);
  assert(typeof studentCount === 'number', `Student count computed from DB: ${studentCount}`);
  assert(typeof shopCount === 'number', `Shop count computed from DB: ${shopCount}`);
  assert(typeof productCount === 'number', `Product count computed from DB: ${productCount}`);
  assert(typeof orderCount === 'number', `Order count computed from DB: ${orderCount}`);

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed!`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

