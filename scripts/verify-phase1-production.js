/**
 * Verify Phase 1 Data from Production MongoDB Atlas
 * Calls the /api/admin/verify-phase1 endpoint on your deployed Vercel app
 */

async function verifyPhase1() {
  const baseUrl = 'https://pool-championship-phi.vercel.app';
  const endpoint = '/api/admin/verify-phase1';
  
  // Admin credentials (from .env)
  const adminUsername = 'admin';
  const adminPassword = 'admin';
  
  try {
    console.log('🔗 Connexion à:', baseUrl);
    console.log('📍 Endpoint:', endpoint);
    console.log('🔐 Authentification admin...\n');

    // Create basic auth header
    const credentials = Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64');
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('========== RAPPORT VÉRIFICATION PHASE 1 ==========\n');
    
    // Phase 1 Summary
    console.log('📊 PHASE 1 - RÉSUMÉ:');
    console.log(`  Groupes: ${data.phase1.groups.total}`);
    console.log(`  Groupes: ${data.phase1.groups.list.join(', ')}`);
    console.log(`  Joueurs total: ${data.phase1.players.total}`);
    console.log(`  Moyenne/groupe: ${data.phase1.players.averagePerGroup}`);
    console.log(`  Matches: ${data.phase1.matches.completed}/${data.phase1.matches.total} complétés\n`);

    // Standings Summary
    console.log('🏆 TOP 2 PAR GROUPE:');
    Object.entries(data.standings).forEach(([group, standings]) => {
      console.log(`  ${group}:`);
      standings.slice(0, 2).forEach((player, idx) => {
        const medal = idx === 0 ? '🥇' : '🥈';
        console.log(`    ${medal} ${player.name} (${player.wins}W, ${player.points}pts)`);
      });
    });

    // Qualified Players Summary
    console.log(`\n👥 QUALIFIÉS PHASE 2:`);
    console.log(`  Total: ${data.qualifiedForPhase2.total}/${data.qualifiedForPhase2.expected}`);
    console.log(`  Valide: ${data.qualifiedForPhase2.isValid ? '✅ OUI' : '❌ NON'}`);

    // Final Status
    console.log(`\n${data.readyForPhase2.status ? '✅' : '⚠️'} PHASE 2 READY?`);
    console.log(`  ${data.readyForPhase2.message}`);

    if (data.readyForPhase2.status) {
      console.log('\n🎯 PROCHAINES ÉTAPES:');
      console.log('  1. Créer endpoint de tirage Phase 2');
      console.log('  2. Diviser 40 joueurs en 8 groupes de 5');
      console.log('  3. Générer matches round-robin Phase 2');
      console.log('  4. Planifier Phase Finale (1/4, 1/2, finale)\n');
    }

    return data;
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

verifyPhase1().then(() => {
  console.log('✅ Vérification complète!\n');
  process.exit(0);
}).catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
