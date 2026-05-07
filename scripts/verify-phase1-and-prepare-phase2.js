const mongoose = require('mongoose');

async function verifyPhase1AndPreparePhase2() {
  try {
    const mongoUri = 'mongodb://localhost:27017/pool-championship';
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    
    const db = mongoose.connection.db;
    const playersCollection = db.collection('players');
    const matchesCollection = db.collection('matches');

    console.log('\n========== VÉRIFICATION PHASE 1 ==========\n');

    // 1. Count groups in Phase 1
    const groups = await playersCollection.distinct('poolGroup', { poolGroup: { $ne: null } });
    console.log(`✓ Nombre de groupes Phase 1: ${groups.length}`);
    console.log(`  Groupes: ${groups.sort().join(', ')}`);

    // 2. Count players per group
    const playersByGroup = {};
    for (const group of groups) {
      const count = await playersCollection.countDocuments({ poolGroup: group });
      playersByGroup[group] = count;
    }
    console.log(`\n✓ Joueurs par groupe:`);
    Object.keys(playersByGroup).sort().forEach(group => {
      console.log(`  ${group}: ${playersByGroup[group]} joueurs`);
    });

    // 3. Count completed matches in Phase 1
    const completedMatches = await matchesCollection.countDocuments({ 
      phase: 'group',
      status: 'completed'
    });
    console.log(`\n✓ Matches terminés Phase 1: ${completedMatches}`);

    // 4. Get TOP 2 from each group (by wins)
    console.log('\n========== TOP 2 PAR GROUPE ==========\n');

    const qualifiedPlayers = [];

    for (const group of groups.sort()) {
      // Get all players in this group
      const playersInGroup = await playersCollection
        .find({ poolGroup: group })
        .project({ id: 1, name: 1, poolGroup: 1 })
        .toArray();

      // Calculate standings for this group
      const standings = {};
      
      for (const player of playersInGroup) {
        standings[player.id] = {
          id: player.id,
          name: player.name,
          wins: 0,
          losses: 0,
          framesFor: 0,
          framesAgainst: 0,
          points: 0,
        };
      }

      // Count wins and frame scores
      const matches = await matchesCollection
        .find({
          phase: 'group',
          groupName: group,
          status: 'completed',
        })
        .toArray();

      for (const match of matches) {
        if (standings[match.player1Id] && standings[match.player2Id]) {
          const score1 = match.score1 || 0;
          const score2 = match.score2 || 0;

          standings[match.player1Id].framesFor += score1;
          standings[match.player1Id].framesAgainst += score2;
          standings[match.player2Id].framesFor += score2;
          standings[match.player2Id].framesAgainst += score1;

          if (score1 > score2) {
            standings[match.player1Id].wins += 1;
            standings[match.player1Id].points += 3;
            standings[match.player2Id].losses += 1;
          } else if (score2 > score1) {
            standings[match.player2Id].wins += 1;
            standings[match.player2Id].points += 3;
            standings[match.player1Id].losses += 1;
          }
        }
      }

      // Sort by points, then by frame difference
      const sorted = Object.values(standings)
        .sort((a, b) => {
          const pointsDiff = b.points - a.points;
          if (pointsDiff !== 0) return pointsDiff;
          return (b.framesFor - b.framesAgainst) - (a.framesFor - a.framesAgainst);
        });

      console.log(`📍 ${group}:`);
      sorted.slice(0, 3).forEach((player, idx) => {
        const position = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '3️⃣';
        console.log(`  ${position} ${player.name} (${player.wins}W-${player.losses}L, ${player.points}pts)`);
        
        if (idx < 2) {
          qualifiedPlayers.push({
            id: player.id,
            name: player.name,
            groupPhase1: group,
            position: idx + 1,
          });
        }
      });
    }

    console.log(`\n========== RÉSUMÉ QUALIFIÉS ==========\n`);
    console.log(`✓ Total de joueurs qualifiés: ${qualifiedPlayers.length}`);
    console.log(`  (2 par groupe × ${groups.length} groupes = ${groups.length * 2})`);

    if (qualifiedPlayers.length === 40) {
      console.log('\n✅ PRÊT POUR PHASE 2!');
      console.log('   - 40 joueurs qualifiés');
      console.log('   - À diviser en 8 groupes de 5');
    } else {
      console.log(`\n⚠️  Nombre anormal de qualifiés: ${qualifiedPlayers.length} (attendu: 40)`);
    }

    // Save qualified players for Phase 2
    console.log('\n✓ Joueurs qualifiés pour Phase 2:');
    qualifiedPlayers.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} (${p.groupPhase1})`);
    });
    console.log(`  ... et ${qualifiedPlayers.length - 5} autres\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifyPhase1AndPreparePhase2();
