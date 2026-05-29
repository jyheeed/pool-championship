import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import { deterministicShuffle } from '@/lib/tournament/draw-engine';
import { generateGroupRoundRobin } from '@/lib/tournament/round-robin-engine';

type TournamentPlayerDoc = {
  id: string;
  name: string;
  poolGroup?: string;
  phase2Group?: string;
};

type TournamentMatchDoc = {
  id: string;
  groupName?: string;
  roundNumber?: number;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
};

type QualifiedPlayer = {
  id: string;
  name: string;
  sourceGroup: string;
  sourceRank: 1 | 2;
  points: number;
  frameDiff: number;
  framesWon: number;
};

type Phase2GroupAssignment = {
  name: string;
  players: QualifiedPlayer[];
  sourceGroups: Set<string>;
};

type Phase2MatchRecord = {
  id: string;
  round: string;
  phase: 'group2';
  groupName: string;
  roundNumber: number;
  date: string;
  time: string;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled';
  venue?: string;
  tableNumber?: number;
  discipline: '8-ball';
};

type PlayerStanding = QualifiedPlayer & {
  wins: number;
  losses: number;
  framesLost: number;
};

function compareStandings(a: PlayerStanding, b: PlayerStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;
  if (b.framesWon !== a.framesWon) return b.framesWon - a.framesWon;
  return a.name.localeCompare(b.name);
}

function buildPhase2GroupNames(): string[] {
  return Array.from({ length: 8 }, (_, index) => `Phase 2 - Group ${String.fromCharCode(65 + index)}`);
}

function buildGroupIndexMap(groupNames: string[]): Map<string, string> {
  return new Map(groupNames.map((groupName) => [groupName.trim().toLowerCase(), groupName]));
}

function formatDateParts(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

export async function getPhase1QualifiedPlayers(): Promise<QualifiedPlayer[]> {
  const players = (await PlayerModel.find({ poolGroup: { $nin: [null, ''] } }).lean()) as TournamentPlayerDoc[];
  const rawGroupNames = Array.from(new Set(players.map((player) => player.poolGroup?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

  if (rawGroupNames.length === 0) {
    throw new Error('No phase 1 groups found');
  }

  const groupKeyMap = buildGroupIndexMap(rawGroupNames);
  const matches = (await MatchModel.find({ phase: 'group', status: 'completed' }).lean()) as TournamentMatchDoc[];
  const matchesByGroup = matches.filter((match) => {
    const groupName = match.groupName?.trim();
    if (!groupName) return false;
    return groupKeyMap.has(groupName.toLowerCase());
  });

  const qualified: QualifiedPlayer[] = [];

  for (const groupName of rawGroupNames) {
    const playersInGroup = players
      .filter((player) => player.poolGroup?.trim() === groupName)
      .map((player) => ({
        id: player.id,
        name: player.name,
        sourceGroup: groupName,
        sourceRank: 1 as 1 | 2,
        points: 0,
        frameDiff: 0,
        framesWon: 0,
        wins: 0,
        losses: 0,
        framesLost: 0,
      }));

    const standingsById = new Map(playersInGroup.map((player) => [player.id, player]));
    const groupMatches = matchesByGroup.filter((match) => match.groupName?.trim() === groupName);

    for (const match of groupMatches) {
      const player1 = standingsById.get(match.player1Id);
      const player2 = standingsById.get(match.player2Id);
      if (!player1 || !player2) continue;

      const score1 = match.score1 ?? 0;
      const score2 = match.score2 ?? 0;

      player1.framesWon += score1;
      player1.framesLost += score2;
      player2.framesWon += score2;
      player2.framesLost += score1;

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

    const sorted = playersInGroup
      .map((player) => {
        const standing = standingsById.get(player.id);
        if (!standing) return null;
        standing.frameDiff = standing.framesWon - standing.framesLost;
        return standing;
      })
      .filter((player): player is PlayerStanding => Boolean(player))
      .sort(compareStandings);

    const topTwo = sorted.slice(0, 2);
    if (topTwo.length < 2) {
      throw new Error(`Group ${groupName} does not have enough completed results to determine top 2`);
    }

    topTwo.forEach((player, index) => {
      qualified.push({
        id: player.id,
        name: player.name,
        sourceGroup: groupName,
        sourceRank: (index + 1) as 1 | 2,
        points: player.points,
        frameDiff: player.frameDiff,
        framesWon: player.framesWon,
      });
    });
  }

  return qualified;
}

export async function generatePhase2Draw() {
  await dbConnect();

  const qualifiedPlayers = await getPhase1QualifiedPlayers();
  if (qualifiedPlayers.length !== 40) {
    throw new Error(`Phase 2 requires 40 qualified players, got ${qualifiedPlayers.length}`);
  }

  const phase2GroupNames = buildPhase2GroupNames();
  const groups: Phase2GroupAssignment[] = phase2GroupNames.map((name) => ({
    name,
    players: [],
    sourceGroups: new Set<string>(),
  }));

  const qualifiedById = new Map(qualifiedPlayers.map((player) => [player.id, player]));
  const seedText = qualifiedPlayers
    .slice()
    .sort((a, b) => a.sourceGroup.localeCompare(b.sourceGroup) || a.sourceRank - b.sourceRank || a.id.localeCompare(b.id))
    .map((player) => `${player.sourceGroup}:${player.sourceRank}:${player.id}`)
    .join('|');

  const shuffledQualified = deterministicShuffle(qualifiedPlayers.map((player) => player.id), seedText)
    .map((playerId) => qualifiedById.get(playerId))
    .filter((player): player is QualifiedPlayer => Boolean(player));

  for (const player of shuffledQualified) {
    const eligibleGroups = groups.filter(
      (group) => group.players.length < 5 && !group.sourceGroups.has(player.sourceGroup)
    );
    const fallbackGroups = groups.filter((group) => group.players.length < 5);
    const pool = eligibleGroups.length > 0 ? eligibleGroups : fallbackGroups;

    if (pool.length === 0) {
      throw new Error('Unable to assign all players to Phase 2 groups');
    }

    pool.sort((a, b) => a.players.length - b.players.length || a.name.localeCompare(b.name));
    const targetGroup = pool[0];
    targetGroup.players.push(player);
    targetGroup.sourceGroups.add(player.sourceGroup);
  }

  await PlayerModel.updateMany({}, { $unset: { phase2Group: '' } });
  await Promise.all(
    groups.flatMap((group) =>
      group.players.map((player) =>
        PlayerModel.findOneAndUpdate({ id: player.id }, { phase2Group: group.name })
      )
    )
  );

  return {
    phase2Groups: Object.fromEntries(
      groups.map((group) => [
        group.name,
        group.players.map((player) => ({
          id: player.id,
          name: player.name,
          sourceGroup: player.sourceGroup,
          sourceRank: player.sourceRank,
        })),
      ])
    ),
    qualifiedPlayers: qualifiedPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      sourceGroup: player.sourceGroup,
      sourceRank: player.sourceRank,
      points: player.points,
      frameDiff: player.frameDiff,
      framesWon: player.framesWon,
    })),
    totalQualified: qualifiedPlayers.length,
    totalGroups: groups.length,
  };
}

export async function generatePhase2Matches(replaceExisting = true) {
  await dbConnect();

  const phase2Players = (await PlayerModel.find({ phase2Group: { $nin: [null, ''] } }).sort({ phase2Group: 1, name: 1 }).lean()) as TournamentPlayerDoc[];
  if (phase2Players.length === 0) {
    throw new Error('No Phase 2 groups found. Generate the Phase 2 draw first.');
  }

  const groups = new Map<string, string[]>();
  for (const player of phase2Players) {
    const groupName = player.phase2Group?.trim();
    if (!groupName) continue;
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)?.push(player.id);
  }

  if (replaceExisting) {
    await MatchModel.deleteMany({ phase: 'group2' });
  } else {
    const existingCount = await MatchModel.countDocuments({ phase: 'group2' });
    if (existingCount > 0) {
      throw new Error('Phase 2 matches already exist. Use replaceExisting=true to regenerate.');
    }
  }

  const now = new Date();
  const { date, time } = formatDateParts(now);
  const documents: Phase2MatchRecord[] = [];

  for (const [groupName, playerIds] of Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const roundRobin = generateGroupRoundRobin({ groupName, playerIds });

    roundRobin.matches.forEach((pair, index) => {
      documents.push({
        id: `ph2-${groupName.replace(/\s+/g, '-').toLowerCase()}-r${pair.roundNumber}-m${index + 1}`,
        round: `${groupName} - Round ${pair.roundNumber}`,
        phase: 'group2',
        groupName,
        roundNumber: pair.roundNumber,
        date,
        time,
        player1Id: pair.player1Id,
        player2Id: pair.player2Id,
        score1: null,
        score2: null,
        status: 'scheduled',
        venue: undefined,
        tableNumber: undefined,
        discipline: '8-ball',
      });
    });
  }

  if (documents.length > 0) {
    await MatchModel.insertMany(documents, { ordered: true });
  }

  return { count: documents.length };
}
