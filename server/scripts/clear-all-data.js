const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');

const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '').trim();

async function clearAllData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: "${mongoose.connection.name}"`);

    const collections = await mongoose.connection.db.collections();
    console.log(`Found ${collections.length} collections. Clearing all documents (collections & indexes will be kept)...\n`);

    for (const col of collections) {
      if (col.collectionName.startsWith('system.')) continue;
      const result = await col.deleteMany({});
      console.log(` - Cleared ${result.deletedCount} documents from: ${col.collectionName}`);
    }

    console.log('\nAll entries deleted successfully! Database structure and collections are preserved.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  }
}

clearAllData();
