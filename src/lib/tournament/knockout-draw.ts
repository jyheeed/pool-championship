import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';

export type KnockoutPlayerInput = {
  id: string;
  name: string;
};

export type KnockoutPlayerSlot = {
  id: string | null;
  name: string;
  isBye?: boolean;
  isPlaceholder?: boolean;
};

export type KnockoutMatch = {
  id: string;
  matchNumber: number;
  roundNumber: number;
  roundName: string;
  player1: KnockoutPlayerSlot;
  player2: KnockoutPlayerSlot;
  winner: KnockoutPlayerSlot | null;
  status: 'pending' | 'bye';
};

export type KnockoutRound = {
  roundNumber: number;
  name: string;
  matches: KnockoutMatch[];
};

export type TournamentDraw = {
  originalPlayersCount: number;
  bracketSize: number;
  numberOfByes: number;
  rounds: KnockoutRound[];
};

export type SaveTournamentDrawOptions = {
  tournamentId?: string;
  replaceExisting?: boolean;
  phase?: 'knockout';
};

export type KnockoutStoredMatch = {
  id: string;
  roundNumber?: number;
  matchNumber?: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string | null;
  score1?: number | null;
  score2?: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'pending' | 'bye';
};

export type KnockoutProgressionPlan = {
  advanced: boolean;
  reason?: string;
  winnerId?: string;
  nextMatchId?: string;
  nextRoundNumber?: number;
  nextMatchNumber?: number;
  nextSlot?: 'player1Id' | 'player2Id';
  patch?: Partial<Record<'player1Id' | 'player2Id', string>>;
};

function isPlaceholderWinnerId(value: string): boolean {
  return value.startsWith('WINNER_');
}

function isByeSlot(value: string): boolean {
  return value === 'X';
}

function determineMatchWinner(match: KnockoutStoredMatch): string | null {
  if (match.winnerId) {
    return match.winnerId;
  }

  if (match.status === 'bye') {
    if (!isByeSlot(match.player1Id)) return match.player1Id;
    if (!isByeSlot(match.player2Id)) return match.player2Id;
    return null;
  }

  if (match.score1 == null || match.score2 == null) return null;
  if (match.score1 === match.score2) return null;
  return match.score1 > match.score2 ? match.player1Id : match.player2Id;
}

export function resolveKnockoutProgression(currentMatch: KnockoutStoredMatch, nextMatch?: KnockoutStoredMatch | null): KnockoutProgressionPlan {
  const winnerId = determineMatchWinner(currentMatch);
  if (!winnerId) {
    return { advanced: false, reason: 'Current match has no decisive winner' };
  }

  const currentRoundNumber = currentMatch.roundNumber ?? 0;
  const currentMatchNumber = currentMatch.matchNumber ?? 0;
  const nextRoundNumber = currentRoundNumber + 1;
  const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
  const nextSlot = currentMatchNumber % 2 === 1 ? 'player1Id' : 'player2Id';

  if (!nextMatch) {
    return {
      advanced: false,
      reason: 'Final completed',
      winnerId,
      nextRoundNumber,
      nextMatchNumber,
    };
  }

  const currentSlotValue = nextMatch[nextSlot];
  if (currentSlotValue && currentSlotValue !== 'X' && !isPlaceholderWinnerId(currentSlotValue) && currentSlotValue !== winnerId) {
    return {
      advanced: false,
      reason: 'Next slot already occupied',
      winnerId,
      nextMatchId: nextMatch.id,
      nextRoundNumber,
      nextMatchNumber,
      nextSlot,
    };
  }

  return {
    advanced: true,
    winnerId,
    nextMatchId: nextMatch.id,
    nextRoundNumber,
    nextMatchNumber,
    nextSlot,
    patch: { [nextSlot]: winnerId },
  };
}

function getRoundCode(participantsCount: number): string {
  if (participantsCount === 2) return 'final';
  if (participantsCount === 4) return 'sf';
  if (participantsCount === 8) return 'qf';
  return `r${participantsCount}`;
}

export function getRoundName(participantsCount: number): string {
  if (participantsCount === 2) return 'Final';
  if (participantsCount === 4) return 'Semi Final';
  if (participantsCount === 8) return 'Quarter Final';
  return `Round of ${participantsCount}`;
}

export function getNextPowerOfTwo(number: number): number {
  const minimumBracketSize = 16;
  if (number <= minimumBracketSize) {
    return minimumBracketSize;
  }

  let size = minimumBracketSize;
  while (size < number) {
    size *= 2;
  }
  return size;
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

export function createByePlayers(count: number): KnockoutPlayerSlot[] {
  return Array.from({ length: count }, () => ({
    id: null,
    name: 'X',
    isBye: true,
  }));
}

function createPlaceholderWinner(matchId: string, matchNumber: number): KnockoutPlayerSlot {
  return {
    id: `WINNER_${matchId}`,
    name: `Winner of match ${matchNumber}`,
    isPlaceholder: true,
  };
}

function createMatchId(roundCode: string, matchNumber: number): string {
  return `ko-${roundCode}-${matchNumber}`;
}

export function createFirstRoundMatches(players: KnockoutPlayerInput[]): {
  bracketSize: number;
  numberOfByes: number;
  matches: KnockoutMatch[];
} {
  const bracketSize = getNextPowerOfTwo(players.length);
  const numberOfByes = bracketSize - players.length;
  const matchCount = bracketSize / 2;

  const shuffledPlayers = shuffleArray(players).map((player) => ({
    id: player.id,
    name: player.name,
  }));
  const byePlayers = createByePlayers(numberOfByes);

  let twoPlayerMatches = 0;
  let oneByeMatches = 0;
  let twoByeMatches = 0;

  if (players.length >= matchCount) {
    oneByeMatches = numberOfByes;
    twoPlayerMatches = matchCount - oneByeMatches;
  } else {
    oneByeMatches = players.length;
    twoByeMatches = matchCount - oneByeMatches;
  }

  const matchTemplates = [
    ...Array.from({ length: twoPlayerMatches }, () => 0),
    ...Array.from({ length: oneByeMatches }, () => 1),
    ...Array.from({ length: twoByeMatches }, () => 2),
  ];

  const shuffledMatchTemplates = shuffleArray(matchTemplates);

  const matches = shuffledMatchTemplates.map((byeCount, index) => {
    const matchNumber = index + 1;
    const roundNumber = 1;
    const roundName = getRoundName(bracketSize);
    const roundCode = getRoundCode(bracketSize);
    const id = createMatchId(roundCode, matchNumber);

    if (byeCount === 2) {
      const player1 = byePlayers.shift();
      const player2 = byePlayers.shift();

      if (!player1 || !player2) {
        throw new Error('Unable to build a valid bracket with byes');
      }

      return {
        id,
        matchNumber,
        roundNumber,
        roundName,
        player1,
        player2,
        winner: null,
        status: 'bye' as const,
      };
    }

    if (byeCount === 1) {
      const player1 = shuffledPlayers.shift();
      const player2 = byePlayers.shift();

      if (!player1 || !player2) {
        throw new Error('Unable to build a valid bracket with byes');
      }

      return {
        id,
        matchNumber,
        roundNumber,
        roundName,
        player1,
        player2,
        winner: {
          id: player1.id,
          name: player1.name,
        },
        status: 'bye' as const,
      };
    }

    const player1 = shuffledPlayers.shift();
    const player2 = shuffledPlayers.shift();

    if (!player1 || !player2) {
      throw new Error('Unable to build a valid bracket with real players');
    }

    return {
      id,
      matchNumber,
      roundNumber,
      roundName,
      player1,
      player2,
      winner: null,
      status: 'pending' as const,
    };
  });

  return {
    bracketSize,
    numberOfByes,
    matches,
  };
}

function buildNextRoundParticipants(matches: KnockoutMatch[]): KnockoutPlayerSlot[] {
  return matches.map((match) => {
    if (match.status === 'bye' && match.winner && !match.winner.isPlaceholder) {
      return {
        id: match.winner.id,
        name: match.winner.name,
      };
    }

    return createPlaceholderWinner(match.id, match.matchNumber);
  });
}

export function generateTournamentDraw(players: KnockoutPlayerInput[]): TournamentDraw {
  if (players.length === 0) {
    throw new Error('At least one player is required to generate a tournament draw');
  }

  const firstRound = createFirstRoundMatches(players);
  const rounds: KnockoutRound[] = [
    {
      roundNumber: 1,
      name: getRoundName(firstRound.bracketSize),
      matches: firstRound.matches,
    },
  ];

  let currentParticipants = buildNextRoundParticipants(firstRound.matches);
  let currentParticipantsCount = firstRound.bracketSize / 2;
  let roundNumber = 2;

  while (currentParticipantsCount >= 2) {
    const roundName = getRoundName(currentParticipantsCount);
    const roundCode = getRoundCode(currentParticipantsCount);

    const matches: KnockoutMatch[] = [];
    for (let index = 0; index < currentParticipants.length; index += 2) {
      const matchNumber = index / 2 + 1;
      const player1 = currentParticipants[index];
      const player2 = currentParticipants[index + 1];

      if (!player1 || !player2) {
        throw new Error('Unable to build the next knockout round');
      }

      matches.push({
        id: createMatchId(roundCode, matchNumber),
        matchNumber,
        roundNumber,
        roundName,
        player1,
        player2,
        winner: null,
        status: 'pending',
      });
    }

    rounds.push({
      roundNumber,
      name: roundName,
      matches,
    });

    currentParticipants = buildNextRoundParticipants(matches);
    currentParticipantsCount /= 2;
    roundNumber += 1;
  }

  return {
    originalPlayersCount: players.length,
    bracketSize: firstRound.bracketSize,
    numberOfByes: firstRound.numberOfByes,
    rounds,
  };
}

function toStorageParticipantId(participant: KnockoutPlayerSlot): string {
  if (participant.id) {
    return participant.id;
  }

  return 'X';
}

export async function saveTournamentDrawToDatabase(draw: TournamentDraw, options: SaveTournamentDrawOptions = {}) {
  await dbConnect();

  const filter = options.tournamentId
    ? { phase: options.phase || 'knockout', tournamentId: options.tournamentId }
    : { phase: options.phase || 'knockout' };

  if (options.replaceExisting !== false) {
    await MatchModel.deleteMany(filter);
  } else {
    const existingCount = await MatchModel.countDocuments(filter);
    if (existingCount > 0) {
      throw new Error('Knockout matches already exist. Use replaceExisting=true to regenerate.');
    }
  }

  const isoParts = new Date().toISOString();
  const date = isoParts.slice(0, 10);
  const time = isoParts.slice(11, 16);

  const documents = draw.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      id: match.id,
      tournamentId: options.tournamentId,
      round: round.name,
      roundNumber: round.roundNumber,
      matchNumber: match.matchNumber,
      phase: options.phase || 'knockout',
      groupName: 'Knockout',
      date,
      time,
      player1Id: toStorageParticipantId(match.player1),
      player2Id: toStorageParticipantId(match.player2),
      winnerId: match.winner?.id ?? null,
      score1: null,
      score2: null,
      status: match.status,
      discipline: '8-ball' as const,
    }))
  );

  if (documents.length > 0) {
    await MatchModel.insertMany(documents, { ordered: true });
    await propagateByeWinners();
  }

  return {
    count: documents.length,
    originalPlayersCount: draw.originalPlayersCount,
    bracketSize: draw.bracketSize,
    numberOfByes: draw.numberOfByes,
    rounds: draw.rounds,
  };
}

export async function propagateByeWinners() {
  await dbConnect();

  const knockoutMatches = (await MatchModel.find({ phase: 'knockout' }).sort({ roundNumber: 1, matchNumber: 1, id: 1 }).lean()) as KnockoutStoredMatch[];
  const matchesByRoundAndNumber = new Map<string, KnockoutStoredMatch>();

  for (const match of knockoutMatches) {
    const roundNumber = match.roundNumber ?? 0;
    const matchNumber = match.matchNumber ?? 0;
    matchesByRoundAndNumber.set(`${roundNumber}:${matchNumber}`, match);
  }

  let updates = 0;
  for (const currentMatch of knockoutMatches) {
    if (currentMatch.status !== 'bye') continue;

    const nextMatch = matchesByRoundAndNumber.get(`${(currentMatch.roundNumber ?? 0) + 1}:${Math.ceil((currentMatch.matchNumber ?? 0) / 2)}`);
    const plan = resolveKnockoutProgression(currentMatch, nextMatch);

    if (!plan.advanced || !plan.nextMatchId || !plan.patch) continue;

    await MatchModel.findOneAndUpdate(
      { id: plan.nextMatchId, phase: 'knockout' },
      {
        $set: plan.patch,
      }
    );
    updates += 1;
  }

  return { updates };
}