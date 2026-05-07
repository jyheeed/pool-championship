import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import { requireAdmin } from '@/lib/api-auth';

type GroupStanding = {
  id: string;
  name: string;
  group: string;
  wins: number;
  losses: number;
  draws: number;
  framesFor: number;
  framesAgainst: number;
  points: number;
};

type QualifiedPlayer = {
  id: string;
  name: string;
  groupPhase1: string;
  position: number;
  wins: number;
  points: number;
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    await dbConnect();

    console.log('📊 Vérification PHASE 1...');

    // 1. Get all groups
    const groups = await PlayerModel.distinct('poolGroup', { poolGroup: { $ne: null } });
    console.log(`✓ Nombre de groupes: ${groups.length}`);

    // 2. Count all matches
    const totalMatches = await MatchModel.countDocuments({ phase: 'group' });
    const completedMatches = await MatchModel.countDocuments({ 
      phase: 'group',
      status: 'completed'
    });
    console.log(`✓ Matches: ${completedMatches}/${totalMatches} complétés`);

    // 3. Count players per group
    const playersByGroup: Record<string, number> = {};
    for (const group of groups) {
      const count = await PlayerModel.countDocuments({ poolGroup: group });
      playersByGroup[group] = count;
    }
    const totalPlayers = Object.values(playersByGroup).reduce((a, b) => a + b, 0);
    console.log(`✓ Total joueurs: ${totalPlayers}`);

    // 4. Calculate standings for each group
    const standings: Record<string, GroupStanding[]> = {};
    const qualifiedPlayers: QualifiedPlayer[] = [];

    for (const group of groups.sort()) {
      // Get all players in this group
      const playersInGroup = await PlayerModel.find({ poolGroup: group })
        .select('id name poolGroup')
        .lean();

      // Initialize standings
      const groupStandings: Record<string, GroupStanding> = {};
      for (const player of playersInGroup) {
        groupStandings[player.id] = {
          id: player.id,
          name: player.name,
          group,
          wins: 0,
          losses: 0,
          draws: 0,
          framesFor: 0,
          framesAgainst: 0,
          points: 0,
        };
      }

      // Get all completed matches in this group
      const groupMatches = await MatchModel.find({
        phase: 'group',
        groupName: group,
        status: 'completed',
      }).lean();

      // Calculate stats
      for (const match of groupMatches) {
        if (groupStandings[match.player1Id] && groupStandings[match.player2Id]) {
          const score1 = match.score1 || 0;
          const score2 = match.score2 || 0;

          groupStandings[match.player1Id].framesFor += score1;
          groupStandings[match.player1Id].framesAgainst += score2;
          groupStandings[match.player2Id].framesFor += score2;
          groupStandings[match.player2Id].framesAgainst += score1;

          if (score1 > score2) {
            groupStandings[match.player1Id].wins += 1;
            groupStandings[match.player1Id].points += 3;
            groupStandings[match.player2Id].losses += 1;
          } else if (score2 > score1) {
            groupStandings[match.player2Id].wins += 1;
            groupStandings[match.player2Id].points += 3;
            groupStandings[match.player1Id].losses += 1;
          } else {
            groupStandings[match.player1Id].draws += 1;
            groupStandings[match.player1Id].points += 1;
            groupStandings[match.player2Id].draws += 1;
            groupStandings[match.player2Id].points += 1;
          }
        }
      }

      // Sort standings
      const sorted = Object.values(groupStandings)
        .sort((a, b) => {
          const pointsDiff = b.points - a.points;
          if (pointsDiff !== 0) return pointsDiff;
          return (b.framesFor - b.framesAgainst) - (a.framesFor - a.framesAgainst);
        });

      standings[group] = sorted;

      // Add top 2 to qualified players
      sorted.slice(0, 2).forEach((player, idx) => {
        qualifiedPlayers.push({
          id: player.id,
          name: player.name,
          groupPhase1: group,
          position: idx + 1,
          wins: player.wins,
          points: player.points,
        });
      });
    }

    const report = {
      timestamp: new Date().toISOString(),
      phase1: {
        groups: {
          total: groups.length,
          list: groups.sort(),
        },
        players: {
          total: totalPlayers,
          byGroup: playersByGroup,
          averagePerGroup: (totalPlayers / groups.length).toFixed(1),
        },
        matches: {
          total: totalMatches,
          completed: completedMatches,
          pending: totalMatches - completedMatches,
        },
      },
      standings: standings,
      qualifiedForPhase2: {
        total: qualifiedPlayers.length,
        expected: groups.length * 2,
        isValid: qualifiedPlayers.length === groups.length * 2,
        players: qualifiedPlayers,
      },
      readyForPhase2: {
        status: qualifiedPlayers.length === groups.length * 2 && completedMatches > 0,
        message: 
          qualifiedPlayers.length !== groups.length * 2 
            ? `Erreur: ${qualifiedPlayers.length} joueurs au lieu de ${groups.length * 2}`
            : completedMatches === 0
            ? 'Erreur: aucun match complété'
            : '✅ Prêt pour Phase 2!',
      },
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
