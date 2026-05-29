import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import { getPhase1QualifiedPlayers } from '@/lib/tournament/phase-2-service';

type TournamentPlayerDoc = {
  id: string;
  name: string;
  phase2Group?: string;
};

type TournamentMatchDoc = {
  id: string;
  round?: string;
  phase?: 'group' | 'group2' | 'knockout';
  groupName?: string;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
};

type StandingEntry = {
  id: string;
  name: string;
  groupName: string;
  wins: number;
  losses: number;
  points: number;
  framesFor: number;
  framesAgainst: number;
  frameDiff: number;
};

type FinalBracketSource = 'auto' | 'phase1' | 'phase2' | 'direct16';

type FinalDrawOptions = {
  protectedPlayerNames?: string[];
};

type KnockoutMatchDoc = {
  id: string;
  round: string;
  phase: 'knockout';
  date: string;
  time: string;
  player1Id: string;
  player2Id: string;
  score1: null;
  score2: null;
  status: 'scheduled';
  discipline: '8-ball';
};

function formatDateParts(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function compareStandings(a: StandingEntry, b: StandingEntry): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;
  if (b.framesFor !== a.framesFor) return b.framesFor - a.framesFor;
  return a.name.localeCompare(b.name);
}

async function collectPhase2Qualifiers(): Promise<StandingEntry[]> {
  const phase2Players = (await PlayerModel.find({ phase2Group: { $nin: [null, ''] } }).lean()) as TournamentPlayerDoc[];
  if (phase2Players.length === 0) {
    throw new Error('No Phase 2 groups found. Generate and complete Phase 2 first.');
  }

  const phase2GroupNames = Array.from(
    new Set(phase2Players.map((player) => player.phase2Group?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  if (phase2GroupNames.length !== 8) {
    throw new Error(`Final phase requires 8 Phase 2 groups, got ${phase2GroupNames.length}`);
  }

  const phase2Matches = (await MatchModel.find({ phase: 'group2', status: 'completed' }).lean()) as TournamentMatchDoc[];
  const winners: StandingEntry[] = [];

  for (const groupName of phase2GroupNames) {
    const groupPlayers = phase2Players.filter((player) => player.phase2Group?.trim() === groupName);
    if (groupPlayers.length < 2) {
      throw new Error(`Group ${groupName} does not have enough players`);
    }

    const standingsById = new Map<string, StandingEntry>();
    for (const player of groupPlayers) {
      standingsById.set(player.id, {
        id: player.id,
        name: player.name,
        groupName,
        wins: 0,
        losses: 0,
        points: 0,
        framesFor: 0,
        framesAgainst: 0,
        frameDiff: 0,
      });
    }

    const groupMatches = phase2Matches.filter((match) => match.groupName?.trim() === groupName);
    if (groupMatches.length === 0) {
      throw new Error(`Group ${groupName} has no completed Phase 2 matches`);
    }

    for (const match of groupMatches) {
      const player1 = standingsById.get(match.player1Id);
      const player2 = standingsById.get(match.player2Id);
      if (!player1 || !player2) continue;

      const score1 = match.score1 ?? 0;
      const score2 = match.score2 ?? 0;

      player1.framesFor += score1;
      player1.framesAgainst += score2;
      player2.framesFor += score2;
      player2.framesAgainst += score1;

      if (score1 > score2) {
        player1.wins += 1;
        player1.points += 3;
        player2.losses += 1;
      } else if (score2 > score1) {
        player2.wins += 1;
        player2.points += 3;
        player1.losses += 1;
      }
    }

    const sorted = Array.from(standingsById.values())
      .map((player) => ({
        ...player,
        frameDiff: player.framesFor - player.framesAgainst,
      }))
      .sort(compareStandings);

    const winner = sorted[0];
    if (!winner) {
      throw new Error(`Could not determine winner for group ${groupName}`);
    }

    winners.push(winner);
  }

  if (winners.length !== 8) {
    throw new Error(`Final phase requires 8 qualifiers, got ${winners.length}`);
  }

  return winners;
}

async function collectDirect16Players(protectedPlayerNames: string[] = []): Promise<StandingEntry[]> {
  const players = (await PlayerModel.find({}).sort({ isSeeded: -1, name: 1 }).lean()) as TournamentPlayerDoc[];
  if (players.length !== 16) {
    throw new Error(`Direct 16-player draw requires exactly 16 players, got ${players.length}`);
  }

  const protectedNames = new Set(protectedPlayerNames.map(normalizeName).filter(Boolean));
  const protectedPlayers = players.filter((player) => protectedNames.has(normalizeName(player.name)));
  const otherPlayers = players.filter((player) => !protectedNames.has(normalizeName(player.name)));

  if (protectedPlayers.length > 0 && protectedPlayers.length > otherPlayers.length) {
    throw new Error('Not enough non-protected players to separate the protected draw seeds');
  }

  const arrangedPlayers: TournamentPlayerDoc[] = [];
  const shuffledProtectedPlayers = shuffleArray(protectedPlayers);
  const shuffledOtherPlayers = shuffleArray(otherPlayers);

  for (const protectedPlayer of shuffledProtectedPlayers) {
    arrangedPlayers.push(protectedPlayer);
    const opponent = shuffledOtherPlayers.shift();
    if (!opponent) {
      throw new Error('Unable to build protected direct draw pairings');
    }
    arrangedPlayers.push(opponent);
  }

  arrangedPlayers.push(...shuffleArray(shuffledOtherPlayers));

  if (arrangedPlayers.length !== 16) {
    throw new Error(`Direct 16-player draw could not build 16 arranged players, got ${arrangedPlayers.length}`);
  }

  return arrangedPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    groupName: 'Direct Draw',
    wins: 0,
    losses: 0,
    points: 0,
    framesFor: 0,
    framesAgainst: 0,
    frameDiff: 0,
  }));
}

async function collectFinalBracketQualifiers(source: FinalBracketSource): Promise<StandingEntry[]> {
  if (source === 'phase1') {
    const phase1Qualifiers = await getPhase1QualifiedPlayers();
    if (phase1Qualifiers.length !== 8) {
      throw new Error(`Direct final bracket requires 8 qualified players, got ${phase1Qualifiers.length}`);
    }

    return phase1Qualifiers.map((player) => ({
      id: player.id,
      name: player.name,
      groupName: player.sourceGroup,
      wins: 0,
      losses: 0,
      points: player.points,
      framesFor: player.framesWon,
      framesAgainst: 0,
      frameDiff: player.frameDiff,
    }));
  }

  if (source === 'phase2') {
    return collectPhase2Qualifiers();
  }

  if (source === 'direct16') {
    return collectDirect16Players();
  }

  try {
    return await collectPhase2Qualifiers();
  } catch (phase2Error) {
    try {
      return await collectFinalBracketQualifiers('phase1');
    } catch {
      try {
        return await collectDirect16Players();
      } catch {
        throw phase2Error;
      }
    }
  }
}

export async function generateFinalBracket(replaceExisting = true, source: FinalBracketSource = 'auto', options: FinalDrawOptions = {}) {
  await dbConnect();

  const winners = source === 'direct16'
    ? await collectDirect16Players(options.protectedPlayerNames || [])
    : await collectFinalBracketQualifiers(source);

  if (replaceExisting) {
    await MatchModel.deleteMany({ phase: 'knockout' });
  } else {
    const existingKnockoutCount = await MatchModel.countDocuments({ phase: 'knockout' });
    if (existingKnockoutCount > 0) {
      throw new Error('Knockout matches already exist. Use replaceExisting=true to regenerate.');
    }
  }

  const shuffledWinners = source === 'direct16' ? winners : shuffleArray(winners);
  const { date, time } = formatDateParts(new Date());

  const roundOf16Matches: KnockoutMatchDoc[] = shuffledWinners.length === 16
    ? Array.from({ length: 8 }, (_, index) => {
        const player1 = shuffledWinners[index * 2];
        const player2 = shuffledWinners[index * 2 + 1];

        return {
          id: `ko-r16-${index + 1}`,
          round: `Round of 16 ${index + 1}`,
          phase: 'knockout',
          date,
          time,
          player1Id: player1.id,
          player2Id: player2.id,
          score1: null,
          score2: null,
          status: 'scheduled',
          discipline: '8-ball',
        };
      })
    : [];

  const quarterFinals: KnockoutMatchDoc[] = Array.from({ length: 4 }, (_, index) => {
    const player1 = shuffledWinners.length === 16 ? `WINNER_ko-r16-${index * 2 + 1}` : shuffledWinners[index * 2].id;
    const player2 = shuffledWinners.length === 16 ? `WINNER_ko-r16-${index * 2 + 2}` : shuffledWinners[index * 2 + 1].id;

    return {
      id: `ko-qf-${index + 1}`,
      round: `Quarter Final ${index + 1}`,
      phase: 'knockout',
      date,
      time,
      player1Id: player1,
      player2Id: player2,
      score1: null,
      score2: null,
      status: 'scheduled',
      discipline: '8-ball',
    };
  });

  const semiFinals: KnockoutMatchDoc[] = [
    {
      id: 'ko-sf-1',
      round: 'Semi Final 1',
      phase: 'knockout',
      date,
      time,
      player1Id: 'WINNER_ko-qf-1',
      player2Id: 'WINNER_ko-qf-2',
      score1: null,
      score2: null,
      status: 'scheduled',
      discipline: '8-ball',
    },
    {
      id: 'ko-sf-2',
      round: 'Semi Final 2',
      phase: 'knockout',
      date,
      time,
      player1Id: 'WINNER_ko-qf-3',
      player2Id: 'WINNER_ko-qf-4',
      score1: null,
      score2: null,
      status: 'scheduled',
      discipline: '8-ball',
    },
  ];

  const finalMatch: KnockoutMatchDoc = {
    id: 'ko-final-1',
    round: 'Final',
    phase: 'knockout',
    date,
    time,
    player1Id: 'WINNER_ko-sf-1',
    player2Id: 'WINNER_ko-sf-2',
    score1: null,
    score2: null,
    status: 'scheduled',
    discipline: '8-ball',
  };

  const bracketMatches = [...roundOf16Matches, ...quarterFinals, ...semiFinals, finalMatch];
  await MatchModel.insertMany(bracketMatches, { ordered: true });

  return {
    roundOf16: roundOf16Matches.map((match) => ({
      id: match.id,
      round: match.round,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
    })),
    qualifiers: winners.map((winner) => ({
      id: winner.id,
      name: winner.name,
      phase2Group: winner.groupName,
      points: winner.points,
      frameDiff: winner.frameDiff,
    })),
    quarterFinals: quarterFinals.map((match) => ({
      id: match.id,
      round: match.round,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
    })),
    semiFinals: semiFinals.map((match) => ({
      id: match.id,
      round: match.round,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
    })),
    final: {
      id: finalMatch.id,
      round: finalMatch.round,
      player1Id: finalMatch.player1Id,
      player2Id: finalMatch.player2Id,
    },
    count: bracketMatches.length,
  };
}

type KnockoutLink = {
  nextMatchId: string;
  nextSlot: 'player1Id' | 'player2Id';
};

const KNOCKOUT_BRACKET_LINKS: Record<string, KnockoutLink> = {
  'ko-r16-1': { nextMatchId: 'ko-qf-1', nextSlot: 'player1Id' },
  'ko-r16-2': { nextMatchId: 'ko-qf-1', nextSlot: 'player2Id' },
  'ko-r16-3': { nextMatchId: 'ko-qf-2', nextSlot: 'player1Id' },
  'ko-r16-4': { nextMatchId: 'ko-qf-2', nextSlot: 'player2Id' },
  'ko-r16-5': { nextMatchId: 'ko-qf-3', nextSlot: 'player1Id' },
  'ko-r16-6': { nextMatchId: 'ko-qf-3', nextSlot: 'player2Id' },
  'ko-r16-7': { nextMatchId: 'ko-qf-4', nextSlot: 'player1Id' },
  'ko-r16-8': { nextMatchId: 'ko-qf-4', nextSlot: 'player2Id' },
  'ko-qf-1': { nextMatchId: 'ko-sf-1', nextSlot: 'player1Id' },
  'ko-qf-2': { nextMatchId: 'ko-sf-1', nextSlot: 'player2Id' },
  'ko-qf-3': { nextMatchId: 'ko-sf-2', nextSlot: 'player1Id' },
  'ko-qf-4': { nextMatchId: 'ko-sf-2', nextSlot: 'player2Id' },
  'ko-sf-1': { nextMatchId: 'ko-final-1', nextSlot: 'player1Id' },
  'ko-sf-2': { nextMatchId: 'ko-final-1', nextSlot: 'player2Id' },
};

function getKnockoutWinner(match: TournamentMatchDoc): string | null {
  if (match.score1 === null || match.score2 === null) return null;
  if (match.score1 === match.score2) return null;
  return match.score1 > match.score2 ? match.player1Id : match.player2Id;
}

export async function advanceKnockoutBracket(matchId: string) {
  await dbConnect();

  const link = KNOCKOUT_BRACKET_LINKS[matchId];
  if (!link) {
    return { advanced: false, reason: 'No next round mapping for this match' };
  }

  const currentMatch = (await MatchModel.findOne({ id: matchId, phase: 'knockout' }).lean()) as TournamentMatchDoc | null;
  if (!currentMatch) {
    throw new Error('Knockout match not found');
  }

  if (currentMatch.status !== 'completed') {
    return { advanced: false, reason: 'Current match is not completed yet' };
  }

  const winnerId = getKnockoutWinner(currentMatch);
  if (!winnerId) {
    throw new Error('Completed knockout match requires a decisive winner (no draw)');
  }

  const nextMatch = (await MatchModel.findOne({ id: link.nextMatchId, phase: 'knockout' }).lean()) as TournamentMatchDoc | null;
  if (!nextMatch) {
    throw new Error('Next knockout match not found');
  }

  await MatchModel.findOneAndUpdate(
    { id: link.nextMatchId, phase: 'knockout' },
    {
      $set: {
        [link.nextSlot]: winnerId,
        status: nextMatch.status === 'completed' ? 'scheduled' : nextMatch.status,
        score1: nextMatch.status === 'completed' ? null : nextMatch.score1,
        score2: nextMatch.status === 'completed' ? null : nextMatch.score2,
      },
    }
  );

  return {
    advanced: true,
    winnerId,
    fromMatchId: matchId,
    toMatchId: link.nextMatchId,
    slot: link.nextSlot,
  };
}
