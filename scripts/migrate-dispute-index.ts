/**
 * Migration: Fix Dispute Unique Index for Multi-Guard Jobs
 * ─────────────────────────────────────────────────────────────────────────────
 * This script drops the old { jobId, raisedByUid } unique index on the
 * disputes collection and lets Mongoose recreate it with the new compound
 * index { jobId, raisedByUid, againstUid } on next server startup.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-dispute-index.ts
 * Or:    npx tsx scripts/migrate-dispute-index.ts
 *
 * NOTE: Run this ONCE before deploying the updated Dispute model.
 */

import mongoose from 'mongoose';
// @ts-ignore — standalone migration script, dotenv types may not be installed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables.');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected.');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('ERROR: Could not access database.');
    process.exit(1);
  }

  const collection = db.collection('disputes');

  // List current indexes
  const indexes = await collection.indexes();
  console.log('\nCurrent indexes on disputes collection:');
  for (const idx of indexes) {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
  }

  // Find and drop the old index
  const oldIndex = indexes.find(
    idx => idx.key && idx.key.jobId === 1 && idx.key.raisedByUid === 1 && !idx.key.againstUid
  );

  if (oldIndex) {
    console.log(`\nDropping old index: ${oldIndex.name}...`);
    await collection.dropIndex(oldIndex.name!);
    console.log('Old index dropped successfully.');
  } else {
    console.log('\nOld index { jobId, raisedByUid } not found — may already be migrated.');
  }

  // Create the new index
  console.log('\nCreating new index { jobId: 1, raisedByUid: 1, againstUid: 1 } (unique)...');
  try {
    await collection.createIndex(
      { jobId: 1, raisedByUid: 1, againstUid: 1 },
      { unique: true, name: 'jobId_1_raisedByUid_1_againstUid_1' }
    );
    console.log('New index created successfully.');
  } catch (err: any) {
    if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
      console.log('New index already exists.');
    } else {
      throw err;
    }
  }

  // Verify
  const newIndexes = await collection.indexes();
  console.log('\nUpdated indexes:');
  for (const idx of newIndexes) {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
  }

  await mongoose.disconnect();
  console.log('\nMigration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
