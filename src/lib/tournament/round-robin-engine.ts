import type { GroupRoundRobinInput, GroupRoundRobinResult, RoundRobinMatchPair } from '@/lib/tournament/types';

const BYE = '__BYE__';

export function generateGroupRoundRobin(input: GroupRoundRobinInput): GroupRoundRobinResult {
  const uniquePlayers = Array.from(new Set(input.playerIds.filter(Boolean)));

  if (uniquePlayers.length < 2) {
    return {
      groupName: input.groupName,
      matches: [],
    };
  }

  const rotation = [...uniquePlayers];
  if (rotation.length % 2 === 1) {
    rotation.push(BYE);
  }

  const rounds = rotation.length - 1;
  const half = rotation.length / 2;
  const matches: RoundRobinMatchPair[] = [];

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    for (let i = 0; i < half; i += 1) {
      const left = rotation[i];
      const right = rotation[rotation.length - 1 - i];

      if (left === BYE || right === BYE) {
        continue;
      }

      matches.push({
        roundNumber: roundIndex + 1,
        player1Id: left,
        player2Id: right,
      });
    }

    const fixed = rotation[0];
    const tail = rotation.slice(1);
    tail.unshift(tail.pop() as string);
    rotation.splice(0, rotation.length, fixed, ...tail);
  }

  return {
    groupName: input.groupName,
    matches,
  };
}
