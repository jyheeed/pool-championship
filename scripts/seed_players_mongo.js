const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function toNumberOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-championship';
  const inputArg = process.argv[2];
  const inputPath = inputArg
    ? path.resolve(process.cwd(), inputArg)
    : path.resolve(process.cwd(), '..', 'import_output', 'players.seed.json');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Seed file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Seed file must contain an array of players');
  }

  const players = parsed
    .filter((p) => p && p.id && p.name)
    .map((p) => ({
      id: String(p.id).trim(),
      name: String(p.name).trim(),
      nickname: p.nickname ? String(p.nickname).trim() : undefined,
      nationality: p.nationality ? String(p.nationality).trim() : 'Tunisia',
      age: toNumberOrUndefined(p.age),
      club: p.club ? String(p.club).trim() : undefined,
      photoUrl: p.photo_url ? String(p.photo_url).trim() : undefined,
      poolGroup: p.pool_group ? String(p.pool_group).trim() : undefined,
    }));

  if (players.length === 0) {
    throw new Error('No valid players to import');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const dbNameFromUri = mongoUri.split('/').pop()?.split('?')[0] || 'pool-championship';
    const db = client.db(dbNameFromUri);
    const collection = db.collection('players');

    let upserted = 0;
    for (const player of players) {
      const result = await collection.updateOne(
        { id: player.id },
        {
          $set: {
            ...player,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      if (result.upsertedCount > 0) upserted += 1;
    }

    const total = await collection.countDocuments();
    console.log(`Seed complete. Processed: ${players.length}, newly inserted: ${upserted}, total players: ${total}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
