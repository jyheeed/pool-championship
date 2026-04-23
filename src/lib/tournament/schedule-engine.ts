import type { MatchScheduleAssignment, SchedulableMatch, ScheduleInput, ScheduleResult } from '@/lib/tournament/types';

function sortMatches(matches: SchedulableMatch[]): SchedulableMatch[] {
  return [...matches].sort((a, b) => {
    const byRound = (a.roundNumber ?? Number.MAX_SAFE_INTEGER) - (b.roundNumber ?? Number.MAX_SAFE_INTEGER);
    if (byRound !== 0) return byRound;

    const byGroup = (a.groupName || '').localeCompare(b.groupName || '');
    if (byGroup !== 0) return byGroup;

    return a.id.localeCompare(b.id);
  });
}

function canPlayInSlot(match: SchedulableMatch, busyPlayers: Set<string>): boolean {
  return !busyPlayers.has(match.player1Id) && !busyPlayers.has(match.player2Id);
}

function penalizeBackToBack(match: SchedulableMatch, playerLastSlot: Map<string, number>, currentSlot: number): number {
  let penalty = 0;
  if (playerLastSlot.get(match.player1Id) === currentSlot - 1) penalty += 1;
  if (playerLastSlot.get(match.player2Id) === currentSlot - 1) penalty += 1;
  return penalty;
}

export function generateSchedule(input: ScheduleInput): ScheduleResult {
  const { startDateTime, matchDurationMinutes, breakDurationMinutes, tableCount } = input;

  if (Number.isNaN(startDateTime.getTime())) {
    throw new Error('Invalid schedule start datetime');
  }
  if (tableCount < 1) {
    throw new Error('At least one table is required');
  }

  const slotMinutes = matchDurationMinutes + breakDurationMinutes;
  if (slotMinutes <= 0) {
    throw new Error('Match duration and break must produce a positive slot duration');
  }

  const pending = sortMatches(input.matches);
  const assignments: MatchScheduleAssignment[] = [];
  const playerLastSlot = new Map<string, number>();

  let slotIndex = 0;
  while (pending.length > 0) {
    const busyPlayers = new Set<string>();
    const slotTime = new Date(startDateTime.getTime() + slotIndex * slotMinutes * 60000);

    for (let table = 1; table <= tableCount; table += 1) {
      let bestIndex = -1;
      let bestPenalty = Number.POSITIVE_INFINITY;

      for (let i = 0; i < pending.length; i += 1) {
        const candidate = pending[i];
        if (!canPlayInSlot(candidate, busyPlayers)) {
          continue;
        }

        const penalty = penalizeBackToBack(candidate, playerLastSlot, slotIndex);
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestIndex = i;
          if (penalty === 0) break;
        }
      }

      if (bestIndex === -1) {
        continue;
      }

      const [selected] = pending.splice(bestIndex, 1);
      assignments.push({
        id: selected.id,
        scheduledAt: slotTime,
        tableNumber: table,
      });

      busyPlayers.add(selected.player1Id);
      busyPlayers.add(selected.player2Id);
      playerLastSlot.set(selected.player1Id, slotIndex);
      playerLastSlot.set(selected.player2Id, slotIndex);
    }

    slotIndex += 1;
  }

  return { assignments };
}
