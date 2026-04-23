/* eslint-disable no-console */
const { MongoClient } = require('mongodb');

async function copyCollection(sourceDb, targetDb, name) {
  const sourceCollection = sourceDb.collection(name);
  const targetCollection = targetDb.collection(name);

  const targetCollections = await targetDb.listCollections({ name }, { nameOnly: true }).toArray();
  if (targetCollections.length > 0) {
    await targetCollection.drop();
  }

  const cursor = sourceCollection.find({});
  const batchSize = 1000;
  let batch = [];
  let total = 0;

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= batchSize) {
      await targetCollection.insertMany(batch, { ordered: false });
      total += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCollection.insertMany(batch, { ordered: false });
    total += batch.length;
  }

  const indexes = await sourceCollection.indexes();
  const nonDefaultIndexes = indexes.filter((idx) => idx.name !== '_id_');
  for (const idx of nonDefaultIndexes) {
    const options = {
      name: idx.name,
      unique: idx.unique,
      sparse: idx.sparse,
      expireAfterSeconds: idx.expireAfterSeconds,
      partialFilterExpression: idx.partialFilterExpression,
      collation: idx.collation,
      weights: idx.weights,
      default_language: idx.default_language,
      language_override: idx.language_override,
      textIndexVersion: idx.textIndexVersion,
      '2dsphereIndexVersion': idx['2dsphereIndexVersion'],
      bits: idx.bits,
      min: idx.min,
      max: idx.max,
      bucketSize: idx.bucketSize,
      wildcardProjection: idx.wildcardProjection,
      hidden: idx.hidden,
    };

    Object.keys(options).forEach((key) => {
      if (options[key] === undefined) {
        delete options[key];
      }
    });

    await targetCollection.createIndex(idx.key, options);
  }

  return total;
}

async function main() {
  const remoteUri = process.env.REMOTE_URI;
  const sourceDbName = process.env.SOURCE_DB || 'test';
  const localUri = process.env.LOCAL_URI || 'mongodb://localhost:27017';
  const targetDbName = process.env.TARGET_DB || 'pool-championship';

  if (!remoteUri) {
    throw new Error('REMOTE_URI environment variable is required');
  }

  const sourceClient = new MongoClient(remoteUri);
  const targetClient = new MongoClient(localUri);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);

    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
    const names = collections.map((c) => c.name).filter((name) => !name.startsWith('system.'));

    console.log(`Cloning ${names.length} collections from ${sourceDbName} to ${targetDbName}...`);

    for (const name of names) {
      const count = await copyCollection(sourceDb, targetDb, name);
      console.log(`- ${name}: ${count} documents copied`);
    }

    console.log('Clone completed successfully.');
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

main().catch((error) => {
  console.error('Clone failed:', error.message);
  process.exit(1);
});
