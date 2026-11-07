/**
 * Migration: replace the legacy unique `studentId_1` index with a partial one.
 *
 * The old index was unique but not sparse/partial, so every account without a
 * student ID (shop owners) indexed as `null`. The first such account succeeded
 * and every one after it failed with:
 *   E11000 duplicate key error ... index: studentId_1 dup key: { studentId: null }
 *
 * The replacement keeps student IDs unique among documents that actually have
 * one, and ignores accounts that do not.
 *
 * Run once per environment:  node scripts/fix-student-id-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cuet_ebazar';
const INDEX_NAME = 'studentId_1';
const PARTIAL_FILTER = { studentId: { $type: 'string' } };

async function run() {
  await mongoose.connect(MONGO_URI);
  const users = mongoose.connection.db.collection('users');
  console.log(`Connected to ${mongoose.connection.name} @ ${mongoose.connection.host}`);

  const indexes = await users.indexes();
  const existing = indexes.find((i) => i.name === INDEX_NAME);

  if (!existing) {
    console.log(`No ${INDEX_NAME} index found - nothing to drop.`);
  } else if (existing.partialFilterExpression) {
    console.log(`${INDEX_NAME} is already a partial index - nothing to do.`);
    await mongoose.disconnect();
    return;
  } else {
    console.log(`Found legacy index: unique=${!!existing.unique} sparse=${!!existing.sparse}`);
    await users.dropIndex(INDEX_NAME);
    console.log(`Dropped ${INDEX_NAME}.`);
  }

  // Guard: a duplicate real student ID would make the new index fail to build
  const duplicates = await users
    .aggregate([
      { $match: { studentId: { $type: 'string' } } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ])
    .toArray();

  if (duplicates.length > 0) {
    console.error('Cannot create unique index - duplicate student IDs exist:');
    duplicates.forEach((d) => console.error(`   ${d._id} x${d.count}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  await users.createIndex({ studentId: 1 }, { unique: true, partialFilterExpression: PARTIAL_FILTER });
  console.log('Created partial unique index on studentId.');

  const after = (await users.indexes()).find((i) => i.name === INDEX_NAME);
  console.log('Now:', JSON.stringify({
    unique: !!after.unique,
    partialFilterExpression: after.partialFilterExpression
  }));

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Migration failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
