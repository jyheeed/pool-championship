import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MatchModel from '@/models/Match';
import { createFirstRoundMatches, generateTournamentDraw, getNextPowerOfTwo, resolveKnockoutProgression, saveTournamentDrawToDatabase } from './knockout-draw';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(async () => undefined),
}));

vi.mock('@/models/Match', () => ({
  default: {
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
    insertMany: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

const mockedMatchModel = MatchModel as unknown as {
  deleteMany: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
  insertMany: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
};

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
  }));
}

function collectRealPlayerIds(drawPlayers: ReturnType<typeof createFirstRoundMatches>['matches']) {
  return drawPlayers.flatMap((match) => [match.player1, match.player2]).filter((slot) => slot.name !== 'X').map((slot) => slot.id as string);
}

describe('knockout draw generator', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    mockedMatchModel.deleteMany.mockReset();
    mockedMatchModel.countDocuments.mockReset();
    mockedMatchModel.insertMany.mockReset();
    mockedMatchModel.find.mockReset();
    mockedMatchModel.findOneAndUpdate.mockReset();
    mockedMatchModel.find.mockImplementation(() => ({
      sort: () => ({
        lean: async () => [],
      }),
      lean: async () => [],
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes the expected bracket size', () => {
    expect(getNextPowerOfTwo(1)).toBe(16);
    expect(getNextPowerOfTwo(14)).toBe(16);
    expect(getNextPowerOfTwo(16)).toBe(16);
    expect(getNextPowerOfTwo(17)).toBe(32);
    expect(getNextPowerOfTwo(31)).toBe(32);
    expect(getNextPowerOfTwo(32)).toBe(32);
    expect(getNextPowerOfTwo(55)).toBe(64);
    expect(getNextPowerOfTwo(64)).toBe(64);
    expect(getNextPowerOfTwo(65)).toBe(128);
  });

  for (const count of [14, 16, 17, 31, 32, 55, 64, 65]) {
    it(`generates a valid bracket for ${count} players`, () => {
      const players = makePlayers(count);
      const draw = generateTournamentDraw(players);

      const expectedBracketSize = getNextPowerOfTwo(count);
      const expectedByes = expectedBracketSize - count;
      const firstRound = draw.rounds[0];

      expect(draw.originalPlayersCount).toBe(count);
      expect(draw.bracketSize).toBe(expectedBracketSize);
      expect(draw.numberOfByes).toBe(expectedByes);
      expect(draw.rounds.length).toBe(Math.log2(expectedBracketSize));
      expect(firstRound.matches).toHaveLength(expectedBracketSize / 2);

      const realPlayerIds = collectRealPlayerIds(firstRound.matches);
      expect(new Set(realPlayerIds).size).toBe(count);
      expect(realPlayerIds).toHaveLength(count);

      const byeSlots = firstRound.matches.flatMap((match) => [match.player1, match.player2]).filter((slot) => slot.name === 'X');
      expect(byeSlots).toHaveLength(expectedByes);
      expect(byeSlots.every((slot) => slot.isBye)).toBe(true);

      const oneByeMatches = firstRound.matches.filter((match) => [match.player1.name, match.player2.name].filter((name) => name === 'X').length === 1);
      const zeroByeMatches = firstRound.matches.filter((match) => match.player1.name !== 'X' && match.player2.name !== 'X');
      const twoByeMatches = firstRound.matches.filter((match) => match.player1.name === 'X' && match.player2.name === 'X');

      if (expectedByes === 0) {
        expect(firstRound.matches.every((match) => match.status === 'pending' && match.winner === null)).toBe(true);
      } else {
        expect(oneByeMatches.every((match) => match.status === 'bye')).toBe(true);
        expect(oneByeMatches.every((match) => match.winner && !match.winner.isPlaceholder)).toBe(true);
        expect(zeroByeMatches.every((match) => match.status === 'pending' && match.winner === null)).toBe(true);
      }

      if (count < 8) {
        expect(twoByeMatches.length).toBeGreaterThan(0);
        expect(twoByeMatches.every((match) => match.status === 'bye' && match.winner === null)).toBe(true);
      } else {
        expect(twoByeMatches).toHaveLength(0);
      }
    });
  }

  it('preserves every player exactly once in the first round', () => {
    const draw = generateTournamentDraw(makePlayers(55));
    const firstRoundPlayers = draw.rounds[0].matches.flatMap((match) => [match.player1, match.player2]);
    const realPlayers = firstRoundPlayers.filter((slot) => slot.name !== 'X').map((slot) => slot.id as string);

    expect(realPlayers).toHaveLength(55);
    expect(new Set(realPlayers).size).toBe(55);
  });

  it('stores knockout draw rows with tournamentId', async () => {
    mockedMatchModel.countDocuments.mockResolvedValue(0);
    mockedMatchModel.insertMany.mockResolvedValue([]);

    const draw = generateTournamentDraw(makePlayers(14));
    await saveTournamentDrawToDatabase(draw, {
      tournamentId: 'tunisian-championship-2026',
      replaceExisting: false,
    });

    expect(mockedMatchModel.insertMany).toHaveBeenCalledTimes(1);
    const inserted = mockedMatchModel.insertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(inserted.every((match) => match.tournamentId === 'tunisian-championship-2026')).toBe(true);
    expect(inserted.some((match) => match.status === 'bye')).toBe(true);
  });

  describe('winner propagation', () => {
    it('routes round 1 match 1 winner to round 2 match 1 player1', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-1', roundNumber: 1, matchNumber: 1, player1Id: 'p1', player2Id: 'p2', score1: 5, score2: 3, status: 'completed' },
        { id: 'ko-r8-1', roundNumber: 2, matchNumber: 1, player1Id: 'WINNER_ko-r16-1', player2Id: 'WINNER_ko-r16-2', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.nextMatchId).toBe('ko-r8-1');
      expect(result.nextSlot).toBe('player1Id');
      expect(result.patch).toEqual({ player1Id: 'p1' });
    });

    it('routes round 1 match 2 winner to round 2 match 1 player2', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-2', roundNumber: 1, matchNumber: 2, player1Id: 'p3', player2Id: 'p4', score1: 1, score2: 4, status: 'completed' },
        { id: 'ko-r8-1', roundNumber: 2, matchNumber: 1, player1Id: 'WINNER_ko-r16-1', player2Id: 'WINNER_ko-r16-2', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.nextMatchId).toBe('ko-r8-1');
      expect(result.nextSlot).toBe('player2Id');
      expect(result.patch).toEqual({ player2Id: 'p4' });
    });

    it('routes round 1 match 3 winner to round 2 match 2 player1', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-3', roundNumber: 1, matchNumber: 3, player1Id: 'p5', player2Id: 'p6', score1: 6, score2: 2, status: 'completed' },
        { id: 'ko-r8-2', roundNumber: 2, matchNumber: 2, player1Id: 'WINNER_ko-r16-3', player2Id: 'WINNER_ko-r16-4', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.nextMatchId).toBe('ko-r8-2');
      expect(result.nextSlot).toBe('player1Id');
      expect(result.patch).toEqual({ player1Id: 'p5' });
    });

    it('routes round 1 match 4 winner to round 2 match 2 player2', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-4', roundNumber: 1, matchNumber: 4, player1Id: 'p7', player2Id: 'p8', score1: 0, score2: 3, status: 'completed' },
        { id: 'ko-r8-2', roundNumber: 2, matchNumber: 2, player1Id: 'WINNER_ko-r16-3', player2Id: 'WINNER_ko-r16-4', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.nextMatchId).toBe('ko-r8-2');
      expect(result.nextSlot).toBe('player2Id');
      expect(result.patch).toEqual({ player2Id: 'p8' });
    });

    it('returns final completed when no next match exists', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-final-1', roundNumber: 4, matchNumber: 1, player1Id: 'p9', player2Id: 'p10', score1: 4, score2: 2, status: 'completed' },
        null
      );

      expect(result.advanced).toBe(false);
      expect(result.reason).toBe('Final completed');
      expect(result.winnerId).toBe('p9');
    });

    it('propagates a bye winner automatically to the next round', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-1', roundNumber: 1, matchNumber: 1, player1Id: 'p11', player2Id: 'X', status: 'bye' },
        { id: 'ko-r8-1', roundNumber: 2, matchNumber: 1, player1Id: 'WINNER_ko-r16-1', player2Id: 'WINNER_ko-r16-2', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.winnerId).toBe('p11');
      expect(result.patch).toEqual({ player1Id: 'p11' });
    });

    it('does not duplicate a player into two slots when the slot is already occupied by the same winner', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-1', roundNumber: 1, matchNumber: 1, player1Id: 'p12', player2Id: 'p13', score1: 3, score2: 2, status: 'completed' },
        { id: 'ko-r8-1', roundNumber: 2, matchNumber: 1, player1Id: 'p12', player2Id: 'WINNER_ko-r16-2', status: 'pending' }
      );

      expect(result.advanced).toBe(true);
      expect(result.patch).toEqual({ player1Id: 'p12' });
    });

    it('does not overwrite a slot already filled by another player', () => {
      const result = resolveKnockoutProgression(
        { id: 'ko-r16-2', roundNumber: 1, matchNumber: 2, player1Id: 'p14', player2Id: 'p15', score1: 1, score2: 4, status: 'completed' },
        { id: 'ko-r8-1', roundNumber: 2, matchNumber: 1, player1Id: 'p16', player2Id: 'p17', status: 'pending' }
      );

      expect(result.advanced).toBe(false);
      expect(result.reason).toBe('Next slot already occupied');
      expect(result.winnerId).toBe('p15');
    });
  });
});