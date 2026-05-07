#!/usr/bin/env node

/**
 * Direct MongoDB Atlas Verification Script
 * Connect directly to production database
 */

const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function verifyPhase1() {
  try {
    // Get password from user
    console.log('🔐 Connexion MongoDB Atlas\n');
    const password = await question('Entrez le mot de passe MongoDB (zwghijihed_db_user): ');
    rl.close();

    const mongoUri = `mongodb+srv://zwghijihed_db_user:${password}@cluster0.mk8jemw.mongodb.net/pool-championship?retryWrites=true&w=majority`;

    console.log('\n🔗 Connexion à MongoDB Atlas...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    const db = mongoose.connection.db;
    const playersCollection = db.collection('players');
    const matchesCollection = db.collection('matches');

    console.log('✅ Connecté!\n');

    console.log('========== VÉRIFICATION PHASE 1 ==========\n');

    // 1. Get all groups
    const groups = await playersCollection.distinct('poolGroup', { poolGroup: { $ne: null } });
    console.log(`✓ Nombre de groupes: ${groups.length}`);
    console.log(`  Groupes: ${groups.sort().join(', ')}\n`);

    // 2. Count players
    const playersByGroup = {};
    let totalPlayers = 0;
    for (const group of groups) {
      const count = await playersCollection.countDocuments({ poolGroup: group });
      playersByGroup[group] = count;
      totalPlayers += count;
    }
    console.log(`✓ Total joueurs: ${totalPlayers}`);
    console.log(`  Distribution: `);
    Object.keys(playersByGroup)
      .sort()
      .forEach(g => {
        console.log(`    ${g}: ${playersByGroup[g]}`);
      });

    // 3. Count matches
    const totalMatches = await matchesCollection.countDocuments({ phase: 'group' });
    const completedMatches = await matchesCollection.countDocuments({
      phase: 'group',
      status: 'completed',
    });
    console.log(`\n✓ Matches: ${completedMatches}/${totalMatches} complétés`);

    // 4. Calculate standings
    console.log(`\n========== TOP 2 PAR GROUPE ==========\n`);

    const qualifiedPlayers = [];

    for (const group of groups.sort()) {
      const playersInGroup = await playersCollection
        .find({ poolGroup: group })
        .project({ id: 1, name: 1 })
        .toArray();

      // Initialize standings
      const standings = {};
      for (const player of playersInGroup) {
        standings[player.id] = {
          id: player.id,
          name: player.name,
          wins: 0,
          losses: 0,
          points: 0,
          framesFor: 0,
          framesAgainst: 0,
        };
      }

      // Get matches for this group
      const groupMatches = await matchesCollection
        .find({
          phase: 'group',
          groupName: group,
          status: 'completed',
        })
        .toArray();

      // Calculate
      for (const match of groupMatches) {
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

      // Sort
      const sorted = Object.values(standings).sort((a, b) => {
        const pdiff = b.points - a.points;
        if (pdiff !== 0) return pdiff;
        return (b.framesFor - b.framesAgainst) - (a.framesFor - a.framesAgainst);
      });

      console.log(`📍 ${group}:`);
      sorted.slice(0, 3).forEach((player, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '3️⃣';
        console.log(
          `  ${medal} ${player.name.padEnd(30)} (${player.wins}W, ${player.points}pts, ${player.framesFor}/${player.framesAgainst})`
        );
        if (idx < 2) {
          qualifiedPlayers.push({
            id: player.id,
            name: player.name,
            group,
            position: idx + 1,
            wins: player.wins,
            points: player.points,
          });
        }
      });
    }

    // Summary
    console.log(`\n========== RÉSUMÉ ==========\n`);
    console.log(`✅ PHASE 1 COMPLÈTE`);
    console.log(`  Groupes: ${groups.length}`);
    console.log(`  Joueurs: ${totalPlayers}`);
    console.log(`  Matches: ${completedMatches} complétés`);
    console.log(`  Qualifiés Phase 2: ${qualifiedPlayers.length}/${groups.length * 2}`);

    if (qualifiedPlayers.length === groups.length * 2 && completedMatches > 0) {
      console.log(`\n🎯 ✅ PRÊT POUR PHASE 2!`);
      console.log(`  → Créer tirage pour 8 groupes de 5 joueurs`);
      console.log(`  → Générer matches round-robin Phase 2`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    rl.close();
    process.exit(1);
  }
}

verifyPhase1();
