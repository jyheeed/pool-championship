#!/usr/bin/env node

/**
 * Verify MongoDB data
 * Usage: node scripts/verify-mongo-data.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-championship';

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // List all collections
    console.log('📋 Collections in database:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found!\n');
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count} documents`);
      }
      console.log();
    }

    // Check specific collections
    const collectionsToCheck = ['players', 'matches', 'registrations', 'settings'];
    
    console.log('🔍 Checking specific collections:\n');
    for (const colName of collectionsToCheck) {
      const col = db.collection(colName);
      const count = await col.countDocuments();
      
      if (count > 0) {
        console.log(`✅ ${colName}: ${count} documents`);
        const sample = await col.findOne();
        console.log(`   Sample:`, JSON.stringify(sample, null, 2).substring(0, 200) + '...\n');
      } else {
        console.log(`❌ ${colName}: 0 documents\n`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
