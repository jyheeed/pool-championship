import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import { getSettings } from '@/lib/mongo-service';
import { generateBalancedGroupDraw } from '@/lib/tournament/draw-engine';
import { generateGroupRoundRobin } from '@/lib/tournament/round-robin-engine';
import { generateSchedule } from '@/lib/tournament/schedule-engine';

type DrawInput = {
  groupNames: string[];
  seededPlayerIds: string[];
};

type ScheduleInput = {
  startDateTime: string;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
  tableCount: number;
};

type TournamentPlayerDoc = {
  id: string;
  name: string;
  poolGroup?: string;
  isSeeded?: boolean;
};

type TournamentMatchDoc = {
  id: string;
  round: string;
  phase?: 'group' | 'knockout';
  groupName?: string;
  roundNumber?: number;
  date: string;
  time?: string;
  scheduledAt?: Date;
  tableNumber?: number;
  venue?: string;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
};

function normalizeGroupNames(groupNames: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawName of groupNames) {
    const name = rawName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

function formatDateParts(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

function conflictAtDateTime(existingMatches: TournamentMatchDoc[], currentId: string, scheduledAt: Date, player1Id: string, player2Id: string): boolean {
  const slot = scheduledAt.getTime();

  return existingMatches.some((match) => {
    if (match.id === currentId) return false;
    if (!match.scheduledAt) return false;
    if (match.scheduledAt.getTime() !== slot) return false;

    const players = new Set([match.player1Id, match.player2Id]);
    return players.has(player1Id) || players.has(player2Id);
  });
}

export async function getTournamentState() {
  await dbConnect();
  const players = (await PlayerModel.find({}).sort({ name: 1 }).lean()) as TournamentPlayerDoc[];
  const matches = (await MatchModel.find({ phase: 'group' }).sort({ groupName: 1, roundNumber: 1, scheduledAt: 1 }).lean()) as TournamentMatchDoc[];

  const groups: Record<string, { id: string; name: string; isSeeded: boolean }[]> = {};

  for (const player of players) {
    const groupName = player.poolGroup?.trim() || 'Unassigned';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push({
      id: player.id,
      name: player.name,
      isSeeded: Boolean(player.isSeeded),
    });
  }

  const groupedMatches = matches.map((match) => ({
    id: match.id,
    groupName: match.groupName || 'Unknown',
    round: match.round,
    roundNumber: match.roundNumber,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    status: match.status,
    scheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : null,
    venue: match.venue || null,
    tableNumber: match.tableNumber ?? null,
    date: match.date,
    time: match.time || '',
  }));

  return {
    players,
    groups,
    matches: groupedMatches,
  };
}

export async function generateGroupDraw(input: DrawInput) {
  await dbConnect();

  const groupNames = normalizeGroupNames(input.groupNames);
  if (groupNames.length < 2) {
    throw new Error('At least two groups are required');
  }

  const players = (await PlayerModel.find({}).sort({ id: 1 }).lean()) as TournamentPlayerDoc[];
  const draw = generateBalancedGroupDraw({
    groupNames,
    players: players.map((player) => ({ id: player.id, name: player.name })),
    seededPlayerIds: input.seededPlayerIds,
  });

  await PlayerModel.updateMany({}, { $set: { isSeeded: false } });

  const playerToGroup = new Map<string, string>();
  for (const [groupName, playerIds] of Object.entries(draw.groups)) {
    for (const playerId of playerIds) {
      playerToGroup.set(playerId, groupName);
    }
  }

  await Promise.all(
    players.map((player) => {
      const poolGroup = playerToGroup.get(player.id) || '';
      const isSeeded = input.seededPlayerIds.includes(player.id);
      return PlayerModel.findOneAndUpdate({ id: player.id }, { poolGroup, isSeeded });
    })
  );

  // Keep schedule consistent with latest draw: old group matches are no longer valid.
  await MatchModel.deleteMany({ phase: 'group' });

  return draw;
}

export async function generateGroupMatches(replaceExisting = true) {
  await dbConnect();

  const players = (await PlayerModel.find({ poolGroup: { $nin: [null, ''] } }).sort({ poolGroup: 1, id: 1 }).lean()) as TournamentPlayerDoc[];

  const groups = new Map<string, string[]>();
  for (const player of players) {
    const groupName = player.poolGroup?.trim();
    if (!groupName) continue;

    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)?.push(player.id);
  }

  const existingGroupMatchCount = await MatchModel.countDocuments({ phase: 'group' });
  if (existingGroupMatchCount > 0 && !replaceExisting) {
    throw new Error('Group matches already exist. Use replaceExisting=true to regenerate.');
  }

  if (replaceExisting) {
    await MatchModel.deleteMany({ phase: 'group' });
  }

  const now = new Date();
  const { date, time } = formatDateParts(now);
  const documents: Array<Record<string, unknown>> = [];

  for (const [groupName, playerIds] of Array.from(groups.entries())) {
    const roundRobin = generateGroupRoundRobin({ groupName, playerIds });

    roundRobin.matches.forEach((pair, index) => {
      documents.push({
        id: `grp-${groupName.replace(/\s+/g, '-').toLowerCase()}-r${pair.roundNumber}-m${index + 1}`,
        round: `${groupName} - Round ${pair.roundNumber}`,
        phase: 'group',
        groupName,
        roundNumber: pair.roundNumber,
        date,
        time,
        player1Id: pair.player1Id,
        player2Id: pair.player2Id,
        score1: null,
        score2: null,
        status: 'scheduled',
        tableNumber: undefined,
        scheduledAt: undefined,
        venue: undefined,
        discipline: '8-ball',
      });
    });
  }

  if (documents.length > 0) {
    await MatchModel.insertMany(documents, { ordered: true });
  }

  return { count: documents.length };
}

export async function generateGroupSchedule(input: ScheduleInput) {
  await dbConnect();

  const startDateTime = new Date(input.startDateTime);
  if (Number.isNaN(startDateTime.getTime())) {
    throw new Error('Invalid startDateTime value');
  }

  const matches = (await MatchModel.find({ phase: 'group' }).sort({ roundNumber: 1, groupName: 1, id: 1 }).lean()) as TournamentMatchDoc[];
  if (matches.length === 0) {
    throw new Error('No group matches found. Generate group matches first.');
  }

  const schedulable = matches.map((match) => ({
    id: match.id,
    groupName: match.groupName,
    roundNumber: match.roundNumber,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
  }));

  const result = generateSchedule({
    matches: schedulable,
    startDateTime,
    matchDurationMinutes: input.matchDurationMinutes,
    breakDurationMinutes: input.breakDurationMinutes,
    tableCount: input.tableCount,
  });

  const map = new Map(result.assignments.map((assignment) => [assignment.id, assignment]));

  await Promise.all(
    matches.map((match) => {
      const assignment = map.get(match.id);
      if (!assignment) return Promise.resolve();

      const parts = formatDateParts(assignment.scheduledAt);
      return MatchModel.findOneAndUpdate(
        { id: match.id },
        {
          scheduledAt: assignment.scheduledAt,
          tableNumber: assignment.tableNumber,
          date: parts.date,
          time: parts.time,
          venue: undefined,
        }
      );
    })
  );

  return { count: result.assignments.length };
}

export async function updateGroupMatchSchedule(matchId: string, scheduledAtRaw: string, venueRaw: string, tableNumber?: number) {
  await dbConnect();

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('Invalid scheduledAt value');
  }

  const venue = venueRaw.trim();
  if (!venue) {
    throw new Error('Venue is required');
  }

  const settings = await getSettings();
  const allowedVenues = (settings.venues || []).map((item) => item.trim()).filter(Boolean);
  if (allowedVenues.length > 0 && !allowedVenues.includes(venue)) {
    throw new Error('Selected venue is not in registered venues');
  }

  const match = (await MatchModel.findOne({ id: matchId, phase: 'group' }).lean()) as TournamentMatchDoc | null;
  if (!match) {
    throw new Error('Group match not found');
  }

  const allGroupMatches = (await MatchModel.find({ phase: 'group', scheduledAt: { $ne: null } }).lean()) as TournamentMatchDoc[];
  if (conflictAtDateTime(allGroupMatches, match.id, scheduledAt, match.player1Id, match.player2Id)) {
    throw new Error('Scheduling conflict: one of the players already has a match at this datetime');
  }

  const parts = formatDateParts(scheduledAt);

  await MatchModel.findOneAndUpdate(
    { id: matchId },
    {
      scheduledAt,
      tableNumber,
      date: parts.date,
      time: parts.time,
      venue,
    }
  );

  return { success: true };
}

export async function getGroupDetail(groupNameRaw: string) {
  await dbConnect();

  const groupName = groupNameRaw.trim();
  const players = (await PlayerModel.find({ poolGroup: groupName }).sort({ name: 1 }).lean()) as TournamentPlayerDoc[];
  const matches = (await MatchModel.find({ phase: 'group', groupName }).sort({ roundNumber: 1, scheduledAt: 1, date: 1, time: 1 }).lean()) as TournamentMatchDoc[];

  const playerMap = new Map(players.map((player) => [player.id, player.name]));

  const enriched = matches.map((match) => ({
    id: match.id,
    round: match.round,
    roundNumber: match.roundNumber,
    player1Id: match.player1Id,
    player1Name: playerMap.get(match.player1Id) || match.player1Id,
    player2Id: match.player2Id,
    player2Name: playerMap.get(match.player2Id) || match.player2Id,
    scheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : null,
    venue: match.venue || null,
    tableNumber: match.tableNumber ?? null,
    status: match.status,
    score1: match.score1,
    score2: match.score2,
  }));

  return {
    groupName,
    players,
    matches: enriched,
  };
}

export async function getScheduleView() {
  await dbConnect();

  const players = (await PlayerModel.find({}).lean()) as TournamentPlayerDoc[];
  const nameMap = new Map(players.map((player) => [player.id, player.name]));

  const matches = (await MatchModel.find({ phase: 'group' }).sort({ scheduledAt: 1, roundNumber: 1, groupName: 1 }).lean()) as TournamentMatchDoc[];

  return matches.map((match) => ({
    id: match.id,
    groupName: match.groupName || '',
    round: match.round,
    roundNumber: match.roundNumber,
    player1Id: match.player1Id,
    player1Name: nameMap.get(match.player1Id) || match.player1Id,
    player2Id: match.player2Id,
    player2Name: nameMap.get(match.player2Id) || match.player2Id,
    scheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : null,
    venue: match.venue || null,
    tableNumber: match.tableNumber ?? null,
    status: match.status,
    score1: match.score1,
    score2: match.score2,
  }));
}
