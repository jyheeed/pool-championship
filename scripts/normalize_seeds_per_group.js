/* eslint-disable no-console */
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();

  try {
    const db = client.db('pool-championship');
    const players = await db
      .collection('players')
      .find({ isSeeded: true, poolGroup: { $nin: [null, ''] } })
      .sort({ poolGroup: 1, id: 1 })
      .toArray();

    const byGroup = new Map();
    for (const player of players) {
      const group = (player.poolGroup || '').trim();
      if (!group) continue;
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push(player);
    }

    const demotedIds = [];
    for (const [, groupedPlayers] of byGroup.entries()) {
      if (groupedPlayers.length <= 1) continue;
      for (let i = 1; i < groupedPlayers.length; i += 1) {
        demotedIds.push(groupedPlayers[i].id);
      }
    }

    if (demotedIds.length > 0) {
      await db.collection('players').updateMany(
        { id: { $in: demotedIds } },
        { $set: { isSeeded: false } }
      );
    }

    const snapshot = Array.from(byGroup.entries()).map(([group, groupedPlayers]) => ({
      group,
      seededBeforeNormalization: groupedPlayers.length,
    }));

    console.log(
      JSON.stringify({
        groups: snapshot,
        demotedIds,
      })
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
