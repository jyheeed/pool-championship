export type Discipline = '8-ball' | '9-ball' | '10-ball';

const BALL_SETS: Record<Discipline, number[]> = {
  '8-ball': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  '9-ball': [1, 2, 3, 4, 5, 6, 7, 8, 9],
  '10-ball': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export function getDisciplineBallSet(discipline: Discipline): number[] {
  return BALL_SETS[discipline];
}

export function normalizeDiscipline(value?: string | null): Discipline {
  if (value === '8-ball' || value === '9-ball' || value === '10-ball') {
    return value;
  }
  return '8-ball';
}

export function normalizeRemainingBalls(discipline: Discipline, balls: number[]): number[] {
  const allowed = new Set(getDisciplineBallSet(discipline));
  return Array.from(new Set(balls))
    .filter((ball) => allowed.has(ball))
    .sort((a, b) => a - b);
}

export function getInitialRemainingBalls(discipline: Discipline): number[] {
  return [...getDisciplineBallSet(discipline)];
}
