const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Product = require('../models/Product');

const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '').trim();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim()
});

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const products = await Product.find({});
    console.log(`Found ${products.length} products to check.\n`);

    let migratedProducts = 0;
    let totalImagesUploaded = 0;

    for (const p of products) {
      if (!p.images || !Array.isArray(p.images) || p.images.length === 0) continue;

      let hasBase64 = false;
      for (const img of p.images) {
        if (img.url && img.url.startsWith('data:')) {
          hasBase64 = true;
          break;
        }
      }

      if (!hasBase64) {
        console.log(`✓ Product "${p.title}" already uses external URLs. Skipping.`);
        continue;
      }

      console.log(`Migrating photos for "${p.title}"...`);
      for (let i = 0; i < p.images.length; i++) {
        const img = p.images[i];
        if (img.url && img.url.startsWith('data:')) {
          try {
            console.log(`  Uploading image ${i + 1}/${p.images.length} to Cloudinary...`);
            const uploadRes = await cloudinary.uploader.upload(img.url, {
              folder: 'ebazar/products',
              transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
                { width: 1600, crop: 'limit' }
              ]
            });

            img.url = uploadRes.secure_url;
            img.thumbnailUrl = uploadRes.secure_url.replace('/upload/', '/upload/c_limit,w_600,q_auto,f_auto/');
            img.publicId = uploadRes.public_id;
            totalImagesUploaded++;
          } catch (uploadErr) {
            console.error(`  Failed to upload image ${i + 1} for "${p.title}":`, uploadErr.message);
          }
        }
      }

      p.markModified('images');
      await p.save();
      migratedProducts++;
      console.log(`✓ Saved "${p.title}" with Cloudinary CDN URLs.\n`);
    }

    console.log(`\n========================================`);
    console.log(`Migration Complete!`);
    console.log(`Products migrated: ${migratedProducts}`);
    console.log(`Total images moved to Cloudinary CDN: ${totalImagesUploaded}`);
    console.log(`========================================\n`);

    // Measure new sizes
    const updatedProducts = await Product.find({});
    let totalSizeKB = 0;
    for (const up of updatedProducts) {
      const sizeKB = Math.round(JSON.stringify(up).length / 1024);
      totalSizeKB += sizeKB;
      console.log(`  - "${up.title}": ${sizeKB} KB`);
    }
    console.log(`\nNew total database payload for all products: ${totalSizeKB} KB (down from ~42,000 KB!)`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
