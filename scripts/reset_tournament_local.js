/* eslint-disable no-console */
const mongoose = require('mongoose');

const isProd = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || (isProd ? '' : 'mongodb://localhost:27017/pool-championship');

async function run() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required in production');
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const playerResult = await mongoose.connection.collection('players').updateMany(
    {},
    { $set: { poolGroup: '', isSeeded: false } }
  );

  const matchResult = await mongoose.connection.collection('matches').deleteMany({ phase: 'group' });

  console.log('Tournament local state reset complete');
  console.log(`Players updated: ${playerResult.modifiedCount}`);
  console.log(`Group matches deleted: ${matchResult.deletedCount}`);
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Failed to reset local tournament state');
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
