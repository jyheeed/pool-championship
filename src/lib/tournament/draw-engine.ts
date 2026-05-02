import type { GroupDrawInput, GroupDrawResult } from '@/lib/tournament/types';

function normalizeGroupNames(groupNames: string[]): string[] {
  const cleaned = groupNames.map((name) => name.trim()).filter(Boolean);
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const name of cleaned) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(name);
  }

  return deduped;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle(items: string[], seedText: string): string[] {
  const result = [...items];
  const random = mulberry32(hashString(seedText));

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function canonicalGroupKey(value: string): string {
  return value.trim().toLowerCase().replace(/^(group|groupe|pool|poule)\s+/, '').replace(/\s+/g, ' ');
}

const FIXED_POOL_VENUES: Record<string, string> = {
  d: 'Break hub',
  f: 'G8',
  i: 'Emperor',
  k: 'Friend Zone',
  l: 'Royal Class',
};

const AUTOMATIC_POOL_VENUES = [
  { venue: 'Friend Zone', count: 1 },
  { venue: 'Break hub', count: 5 },
  { venue: 'G8', count: 3 },
  { venue: 'Royal Class', count: 3 },
  { venue: 'Emperor', count: 3 },
];

export function buildPoolVenueAssignments(groupNames: string[]): Record<string, string> {
  const normalizedGroupNames = groupNames.map((name) => name.trim()).filter(Boolean);
  if (normalizedGroupNames.length !== 20) {
    return {};
  }

  const groupByKey = new Map<string, string>();

  for (const groupName of normalizedGroupNames) {
    groupByKey.set(canonicalGroupKey(groupName), groupName);
  }

  const assignments: Record<string, string> = {};
  const fixedGroupNames = new Set<string>();

  for (const [groupKey, venue] of Object.entries(FIXED_POOL_VENUES)) {
    const groupName = groupByKey.get(groupKey);
    if (!groupName) {
      throw new Error(`Missing required group for venue assignment: Group ${groupKey.toUpperCase()}`);
    }

    assignments[groupName] = venue;
    fixedGroupNames.add(groupName);
  }

  const remainingGroups = normalizedGroupNames
    .filter((groupName) => !fixedGroupNames.has(groupName))
    .sort((a, b) => canonicalGroupKey(a).localeCompare(canonicalGroupKey(b)) || a.localeCompare(b));

  const requiredRemaining = AUTOMATIC_POOL_VENUES.reduce((total, item) => total + item.count, 0);
  if (remainingGroups.length !== requiredRemaining) {
    throw new Error(`Expected ${requiredRemaining} remaining groups for automatic venue allocation, got ${remainingGroups.length}`);
  }

  let index = 0;
  for (const item of AUTOMATIC_POOL_VENUES) {
    for (let count = 0; count < item.count; count += 1) {
      assignments[remainingGroups[index]] = item.venue;
      index += 1;
    }
  }

  return assignments;
}

function buildSnakeOrder(groupCount: number, pickCount: number): number[] {
  const order: number[] = [];
  let direction: 1 | -1 = 1;
  let index = 0;

  while (order.length < pickCount) {
    order.push(index);
    if (direction === 1) {
      if (index === groupCount - 1) {
        direction = -1;
      } else {
        index += 1;
      }
    } else if (index === 0) {
      direction = 1;
    } else {
      index -= 1;
    }
  }

  return order;
}

export function generateBalancedGroupDraw(input: GroupDrawInput): GroupDrawResult {
  const groupNames = normalizeGroupNames(input.groupNames);
  if (groupNames.length < 2) {
    throw new Error('At least two groups are required for group draw generation');
  }

  const players = input.players;
  if (players.length < groupNames.length) {
    throw new Error('Not enough players to fill all groups');
  }

  const playerIds = new Set(players.map((player) => player.id));
  const seedSet = new Set(input.seededPlayerIds);

  if (seedSet.size !== input.seededPlayerIds.length) {
    throw new Error('Seeded players list contains duplicates');
  }

  if (seedSet.size !== groupNames.length) {
    throw new Error('Exactly one seed per group is required');
  }

  for (const seedId of Array.from(seedSet)) {
    if (!playerIds.has(seedId)) {
      throw new Error(`Seeded player not found: ${seedId}`);
    }
  }

  const groups: Record<string, string[]> = {};
  for (const groupName of groupNames) {
    groups[groupName] = [];
  }

  const baseSize = Math.floor(players.length / groupNames.length);
  const remainder = players.length % groupNames.length;
  const targetSizes = groupNames.map((_, index) => baseSize + (index < remainder ? 1 : 0));

  input.seededPlayerIds.forEach((seedId, index) => {
    groups[groupNames[index]].push(seedId);
  });

  const remainingPlayerIds = players
    .map((player) => player.id)
    .filter((id) => !seedSet.has(id));

  const seedText = `${groupNames.join('|')}::${input.seededPlayerIds.join('|')}::${remainingPlayerIds.join('|')}`;
  const shuffledRemaining = deterministicShuffle(remainingPlayerIds, seedText);

  const snakeOrder = buildSnakeOrder(groupNames.length, shuffledRemaining.length * 3);
  let snakePointer = 0;

  for (const playerId of shuffledRemaining) {
    let assigned = false;

    while (!assigned && snakePointer < snakeOrder.length) {
      const groupIndex = snakeOrder[snakePointer];
      snakePointer += 1;

      const groupName = groupNames[groupIndex];
      if (groups[groupName].length >= targetSizes[groupIndex]) {
        continue;
      }

      groups[groupName].push(playerId);
      assigned = true;
    }

    if (!assigned) {
      throw new Error('Failed to assign all players to groups');
    }
  }

  const sizes = groupNames.map((groupName) => groups[groupName].length);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  if (maxSize - minSize > 1) {
    throw new Error('Group balancing constraint violated');
  }

  return { groups };
}
