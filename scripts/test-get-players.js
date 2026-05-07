#!/usr/bin/env node

/**
 * Test getPlayers function directly
 */

const mongoose = require('mongoose');
const path = require('path');

// Set MongoDB URI
process.env.MONGODB_URI = 'mongodb+srv://zwghijihed_db_user:Us5x7kPyJLlN3iYU@cluster0.mk8jemw.mongodb.net/?appName=Cluster0';
process.env.NODE_ENV = 'production';

// Import models and service
const dbConnect = require('./src/lib/mongodb.ts').default || require('./src/lib/mongodb.ts');

async function main() {
  try {
    console.log('🔗 Testing getPlayers()...\n');
    
    // Dynamically import mongo-service (it requires dbConnect to be available)
    const { getPlayers } = await import('./src/lib/mongo-service.ts');
    
    console.log('📥 Calling getPlayers()...');
    const players = await getPlayers();
    
    console.log(`✅ Success! Got ${players.length} players`);
    
    if (players.length > 0) {
      console.log('\n📋 First player:');
      console.log(JSON.stringify(players[0], null, 2));
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
