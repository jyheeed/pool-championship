import dbConnect from './mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import ClubModel from '@/models/Club';
import RegistrationModel from '@/models/Registration';
import SettingsModel from '@/models/Settings';
import { sendRegistrationApprovalEmail } from '@/lib/mailer';
import type {
  Club,
  ClubRow,
  HeadToHead,
  Match,
  MatchRow,
  Player,
  PlayerProfile,
  PlayerRow,
  Registration,
  RegistrationRow,
  Standing,
  TournamentSettings,
} from './types';

// Helper to assert conditions
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type DbPlayer = {
  id: string;
  name: string;
  nickname?: string;
  nationality?: string;
  age?: number;
  club?: string;
  photoUrl?: string;
  poolGroup?: string;
  isSeeded?: boolean;
};

type DbMatch = {
  id: string;
  round: string;
  date: string;
  time?: string;
  venue?: string;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: Match['status'];
  frameScores?: string;
  notes?: string;
  discipline?: Match['discipline'];
};

type DbClub = {
  id: string;
  name: string;
  city?: string;
  logoUrl?: string;
};

type DbRegistration = {
  id: string;
  name: string;
  nickname?: string;
  nationality?: string;
  age?: number;
  email: string;
  phone: string;
  city: string;
  cin?: string;
  club?: string;
  photoUrl?: string;
  status: Registration['status'];
  createdAt?: Date;
  approvedAt?: Date;
};

type DbSetting = {
  key: string;
  value: string;
};

// ── Players ──

export async function getPlayers(): Promise<Player[]> {
  await dbConnect();
  const playerDocs = await PlayerModel.find({}).lean() as DbPlayer[];
  const matches = await getMatches();
  const settings = await getSettings();

  return playerDocs.map((pr) => {
    const playerMatches = matches.filter(
      (m) => m.status === 'completed' && (m.player1Id === pr.id || m.player2Id === pr.id)
    );

    let wins = 0;
    let losses = 0;
    let framesWon = 0;
    let framesLost = 0;

    playerMatches.forEach((m) => {
      const isP1 = m.player1Id === pr.id;
      const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
      const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
      framesWon += myScore;
      framesLost += oppScore;
      if (myScore > oppScore) wins += 1;
      else if (myScore < oppScore) losses += 1;
    });

    return {
      id: pr.id,
      name: pr.name,
      nickname: pr.nickname || undefined,
      nationality: pr.nationality || 'Tunisia',
      age: pr.age || undefined,
      club: pr.club || undefined,
      photoUrl: pr.photoUrl || undefined,
      poolGroup: pr.poolGroup || undefined,
      isSeeded: Boolean(pr.isSeeded),
      wins,
      losses,
      played: playerMatches.length,
      points: wins * settings.pointsWin + losses * settings.pointsLoss,
      framesWon,
      framesLost,
      frameDiff: framesWon - framesLost,
    } satisfies Player;
  });
}

export async function getPlayer(id: string): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((p) => p.id === id) || null;
}

export async function addPlayer(player: PlayerRow): Promise<void> {
  await dbConnect();
  assert(player.id?.trim(), 'Player ID is required');
  assert(player.name?.trim(), 'Player name is required');
  
  await PlayerModel.create({
    id: player.id,
    name: player.name,
    nickname: player.nickname,
    nationality: player.nationality || 'Tunisia',
    age: player.age ? parseInt(player.age, 10) : undefined,
    club: player.club,
    photoUrl: player.photo_url,
    poolGroup: player.pool_group,
    isSeeded: player.is_seeded === 'true',
  });
}

export async function updatePlayer(id: string, player: PlayerRow): Promise<void> {
  await dbConnect();
  assert(player.name?.trim(), 'Player name is required');
  await PlayerModel.findOneAndUpdate({ id }, {
    name: player.name,
    nickname: player.nickname,
    nationality: player.nationality || 'Tunisia',
    age: player.age ? parseInt(player.age, 10) : undefined,
    club: player.club,
    photoUrl: player.photo_url,
    poolGroup: player.pool_group,
    isSeeded: player.is_seeded === 'true',
  });
}

export async function deletePlayer(id: string): Promise<void> {
  await dbConnect();
  await PlayerModel.findOneAndDelete({ id });
}

// ── Matches ──

export async function getMatches(): Promise<Match[]> {
  await dbConnect();
  const matchDocs = await MatchModel.find({}).lean() as DbMatch[];
  const players = await PlayerModel.find({}, 'id name').lean() as Array<Pick<DbPlayer, 'id' | 'name'>>;
  const nameMap: Record<string, string> = {};
  players.forEach((p) => {
    nameMap[p.id] = p.name;
  });

  return matchDocs.map((mr) => ({
    id: mr.id,
    round: mr.round,
    date: mr.date,
    time: mr.time || undefined,
    venue: mr.venue || undefined,
    player1Id: mr.player1Id,
    player2Id: mr.player2Id,
    player1Name: nameMap[mr.player1Id] || mr.player1Id,
    player2Name: nameMap[mr.player2Id] || mr.player2Id,
    score1: mr.score1,
    score2: mr.score2,
    status: mr.status as Match['status'],
    frameScores: mr.frameScores || undefined,
    notes: mr.notes || undefined,
    discipline: mr.discipline as Match['discipline'],
  }));
}

export async function addMatch(match: MatchRow): Promise<void> {
  await dbConnect();
  assert(match.id?.trim(), 'Match ID is required');
  assert(match.player1_id?.trim(), 'Player 1 is required');
  assert(match.player2_id?.trim(), 'Player 2 is required');

  await MatchModel.create({
    id: match.id,
    round: match.round,
    date: match.date,
    time: match.time,
    venue: match.venue,
    player1Id: match.player1_id,
    player2Id: match.player2_id,
    score1: match.score1 ? parseInt(match.score1, 10) : null,
    score2: match.score2 ? parseInt(match.score2, 10) : null,
    status: match.status || 'scheduled',
    frameScores: match.frame_scores,
    notes: match.notes,
    discipline: match.discipline || '8-ball',
  });
}

export async function updateMatch(id: string, match: MatchRow): Promise<void> {
  await dbConnect();
  await MatchModel.findOneAndUpdate({ id }, {
    round: match.round,
    date: match.date,
    time: match.time,
    venue: match.venue,
    player1Id: match.player1_id,
    player2Id: match.player2_id,
    score1: match.score1 ? parseInt(match.score1, 10) : null,
    score2: match.score2 ? parseInt(match.score2, 10) : null,
    status: match.status,
    frameScores: match.frame_scores,
    notes: match.notes,
    discipline: match.discipline,
  });
}

export async function deleteMatch(id: string): Promise<void> {
  await dbConnect();
  await MatchModel.findOneAndDelete({ id });
}

// ── Clubs ──

export async function getClubs(): Promise<Club[]> {
  await dbConnect();
  const clubDocs = await ClubModel.find({}).lean() as DbClub[];
  return clubDocs.map((cr) => ({
    id: cr.id,
    name: cr.name,
    city: cr.city || undefined,
    logoUrl: cr.logoUrl || undefined,
  }));
}

export async function addClub(club: ClubRow): Promise<void> {
  await dbConnect();
  assert(club.id?.trim(), 'Club ID is required');
  assert(club.name?.trim(), 'Club name is required');
  await ClubModel.create({
    id: club.id,
    name: club.name,
    city: club.city,
    logoUrl: club.logo_url,
  });
}

export async function updateClub(id: string, club: ClubRow): Promise<void> {
  await dbConnect();
  await ClubModel.findOneAndUpdate({ id }, {
    name: club.name,
    city: club.city,
    logoUrl: club.logo_url,
  });
}

export async function deleteClub(id: string): Promise<void> {
  await dbConnect();
  await ClubModel.findOneAndDelete({ id });
}

// ── Registrations ──

export async function getRegistrations(): Promise<Registration[]> {
  await dbConnect();
  const regDocs = await RegistrationModel.find({}).lean() as unknown as DbRegistration[];
  return regDocs.map((rr) => ({
    id: rr.id,
    name: rr.name,
    nickname: rr.nickname || undefined,
    nationality: rr.nationality || 'Tunisia',
    age: rr.age || undefined,
    email: rr.email,
    phone: rr.phone,
    city: rr.city,
    cin: rr.cin || undefined,
    club: rr.club || undefined,
    photoUrl: rr.photoUrl || undefined,
    status: rr.status as Registration['status'],
    createdAt: rr.createdAt ? rr.createdAt.toISOString() : new Date().toISOString(),
    approvedAt: rr.approvedAt ? rr.approvedAt.toISOString() : undefined,
  }));
}

export async function addRegistration(reg: RegistrationRow): Promise<void> {
  await dbConnect();
  await RegistrationModel.create({
    id: reg.id || `reg-${Date.now()}`,
    name: reg.name,
    nickname: reg.nickname,
    nationality: reg.nationality || 'Tunisia',
    age: reg.age ? parseInt(reg.age, 10) : undefined,
    email: reg.email,
    phone: reg.phone,
    city: reg.city,
    cin: reg.cin,
    club: reg.club,
    photoUrl: reg.photo_url,
    status: 'pending',
  });
}

export async function updateRegistrationStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  await dbConnect();
  const update: Record<string, unknown> = { status };
  if (status === 'approved') update.approvedAt = new Date();

  const reg = await RegistrationModel.findOneAndUpdate({ id }, update, { new: true }).lean();
  if (reg && status === 'approved') {
    const existingPlayer = await PlayerModel.findOne({ id: reg.id });
    if (!existingPlayer) {
      await addPlayer({
        id: reg.id,
        name: reg.name,
        nickname: reg.nickname || '',
        nationality: reg.nationality || 'Tunisia',
        age: reg.age?.toString() || '',
        club: reg.club || '',
        photo_url: reg.photoUrl || '',
        pool_group: '',
        is_seeded: 'false',
      });
    }

    await sendRegistrationApprovalEmail({
      email: reg.email,
      name: reg.name,
      club: reg.club || undefined,
      city: reg.city || undefined,
    });
  }
}

export async function deleteRegistration(id: string): Promise<void> {
  await dbConnect();
  await RegistrationModel.findOneAndDelete({ id });
}

// ── Settings ──

export async function getSettings(): Promise<TournamentSettings> {
  await dbConnect();
  const settingsDocs = await SettingsModel.find({}).lean() as DbSetting[];
  const map: Record<string, string> = {};
  settingsDocs.forEach((s) => {
    map[s.key] = s.value;
  });

  return {
    name: map.tournament_name || process.env.NEXT_PUBLIC_TOURNAMENT_NAME || 'Pool Championship',
    season: map.season || '2026',
    pointsWin: parseInt(map.points_win || '3', 10),
    pointsLoss: parseInt(map.points_loss || '0', 10),
    logo: map.logo || undefined,
    heroTitle: map.hero_title || undefined,
    heroSubtitle: map.hero_subtitle || undefined,
  };
}

export async function updateSettings(settings: TournamentSettings): Promise<void> {
  await dbConnect();
  const updates = [
    { key: 'tournament_name', value: settings.name },
    { key: 'season', value: settings.season },
    { key: 'points_win', value: String(settings.pointsWin) },
    { key: 'points_loss', value: String(settings.pointsLoss) },
    { key: 'logo', value: settings.logo || '' },
    { key: 'hero_title', value: settings.heroTitle || '' },
    { key: 'hero_subtitle', value: settings.heroSubtitle || '' },
  ];

  for (const item of updates) {
    await SettingsModel.findOneAndUpdate(
      { key: item.key },
      { value: item.value },
      { upsert: true }
    );
  }
}

// ── Combined Operations ──

export async function getStandings(): Promise<Standing[]> {
  const players = await getPlayers();
  const matches = await getMatches();

  return players
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;
      return b.framesWon - a.framesWon;
    })
    .map((player, i) => {
      const playerMatches = matches
        .filter((m) => m.status === 'completed' && (m.player1Id === player.id || m.player2Id === player.id))
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 5);

      const form: ('W' | 'L')[] = playerMatches.map((m) => {
        const isP1 = m.player1Id === player.id;
        const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
        const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
        if (myScore > oppScore) return 'W';
        return 'L';
      });

      return { rank: i + 1, player, form };
    });
}

export async function drawPools(groupNames: string[]): Promise<void> {
  await dbConnect();
  const normalizedGroupNames = groupNames.map((groupName) => groupName.trim()).filter(Boolean);
  if (normalizedGroupNames.length === 0) return;

  const normalizeGroupKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const canonicalGroupByKey = new Map<string, string>();

  for (const groupName of normalizedGroupNames) {
    const normalized = normalizeGroupKey(groupName);
    canonicalGroupByKey.set(normalized, groupName);

    const aliasMatch = normalized.match(/^(group|groupe|pool|poule)\s+(.+)$/i);
    if (aliasMatch?.[2]) {
      canonicalGroupByKey.set(normalizeGroupKey(aliasMatch[2]), groupName);
    }
  }

  const players = (await PlayerModel.find({}).lean()) as Array<{ id: string; poolGroup?: string | null; isSeeded?: boolean }>;
  if (players.length === 0) return;

  const groups = normalizedGroupNames.map((name) => ({ name, players: [] as string[] }));
  const groupLookup = new Map(groups.map((group) => [group.name, group]));

  const fixedSeedsByGroup = new Map<string, string>();
  const unassignedIds: string[] = [];

  for (const player of players) {
    const currentGroup = player.poolGroup?.trim();
    const canonicalGroupName = currentGroup ? canonicalGroupByKey.get(normalizeGroupKey(currentGroup)) : undefined;
    if (player.isSeeded && canonicalGroupName && groupLookup.has(canonicalGroupName) && !fixedSeedsByGroup.has(canonicalGroupName)) {
      fixedSeedsByGroup.set(canonicalGroupName, player.id);
      continue;
    }

    unassignedIds.push(player.id);
  }

  fixedSeedsByGroup.forEach((playerId, groupName) => {
    groupLookup.get(groupName)?.players.push(playerId);
  });

  const totalPlayers = players.length;
  const groupCount = normalizedGroupNames.length;
  const baseSize = Math.floor(totalPlayers / groupCount);
  const extraPlayers = totalPlayers % groupCount;
  const targetSizes = groups.map((_, index) => baseSize + (index < extraPlayers ? 1 : 0));

  const shuffledIds = [...unassignedIds].sort(() => Math.random() - 0.5);

  for (const playerId of shuffledIds) {
    let targetIndex = 0;
    let smallestGroupSize = Number.POSITIVE_INFINITY;

    for (let index = 0; index < groups.length; index++) {
      if (groups[index].players.length >= targetSizes[index]) continue;
      if (groups[index].players.length < smallestGroupSize) {
        smallestGroupSize = groups[index].players.length;
        targetIndex = index;
      }
    }

    groups[targetIndex].players.push(playerId);
  }

  const updates = groups.flatMap((group) => group.players.map((playerId) => ({ playerId, groupName: group.name })));
  await Promise.all(updates.map(({ playerId, groupName }) => PlayerModel.findOneAndUpdate({ id: playerId }, { poolGroup: groupName })));
}

export async function getHeadToHead(p1Id: string, p2Id: string): Promise<HeadToHead | null> {
  const players = await getPlayers();
  const player1 = players.find((p) => p.id === p1Id);
  const player2 = players.find((p) => p.id === p2Id);
  if (!player1 || !player2) return null;

  const matches = await getMatches();
  const h2hMatches = matches.filter(
    (m) =>
      m.status === 'completed' &&
      ((m.player1Id === p1Id && m.player2Id === p2Id) ||
        (m.player1Id === p2Id && m.player2Id === p1Id))
  );

  let p1Wins = 0;
  let p2Wins = 0;
  let totalFrames1 = 0;
  let totalFrames2 = 0;

  h2hMatches.forEach((m) => {
    const isP1First = m.player1Id === p1Id;
    const s1 = isP1First ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const s2 = isP1First ? (m.score2 ?? 0) : (m.score1 ?? 0);
    totalFrames1 += s1;
    totalFrames2 += s2;
    if (s1 > s2) p1Wins += 1;
    else p2Wins += 1;
  });

  return {
    player1,
    player2,
    matches: h2hMatches,
    player1Wins: p1Wins,
    player2Wins: p2Wins,
    totalFrames1,
    totalFrames2,
  };
}

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const [player, matches] = await Promise.all([
    getPlayer(playerId),
    getMatches().then(all => all.filter(m => m.player1Id === playerId || m.player2Id === playerId))
  ]);
  
  if (!player) return null;
  
  return {
    player,
    matches: matches.sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime()),
    recentMatches: matches.slice(0, 5),
  };
}

// ── Bulk Operations ──

export async function deletePlayers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await dbConnect();
  await PlayerModel.deleteMany({ id: { $in: ids } });
}

export async function updatePlayersBulk(ids: string[], updates: Partial<{ pool_group: string; is_seeded: boolean }>): Promise<void> {
  if (ids.length === 0) return;
  await dbConnect();
  
  const dbUpdates: Record<string, unknown> = {};
  if (updates.pool_group !== undefined) {
    dbUpdates.poolGroup = updates.pool_group;
  }
  if (updates.is_seeded !== undefined) {
    dbUpdates.isSeeded = updates.is_seeded;
  }
  
  if (Object.keys(dbUpdates).length === 0) return;
  await PlayerModel.updateMany({ id: { $in: ids } }, dbUpdates);
}

export async function deleteMatches(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await dbConnect();
  await MatchModel.deleteMany({ id: { $in: ids } });
}

export async function checkDuplicateEmail(email: string): Promise<boolean> {
  await dbConnect();
  const existing = await RegistrationModel.findOne({ email: email.toLowerCase().trim() });
  return !!existing;
}
