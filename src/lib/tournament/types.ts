export type TournamentPlayer = {
  id: string;
  name: string;
};

export type GroupDrawInput = {
  groupNames: string[];
  players: TournamentPlayer[];
  seededPlayerIds: string[];
};

export type GroupDrawResult = {
  groups: Record<string, string[]>;
};

export type RoundRobinMatchPair = {
  roundNumber: number;
  player1Id: string;
  player2Id: string;
};

export type GroupRoundRobinInput = {
  groupName: string;
  playerIds: string[];
};

export type GroupRoundRobinResult = {
  groupName: string;
  matches: RoundRobinMatchPair[];
};

export type SchedulableMatch = {
  id: string;
  groupName?: string;
  roundNumber?: number;
  player1Id: string;
  player2Id: string;
};

export type ScheduleInput = {
  matches: SchedulableMatch[];
  startDateTime: Date;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
  tableCount: number;
};

export type MatchScheduleAssignment = {
  id: string;
  scheduledAt: Date;
  tableNumber: number;
};

export type ScheduleResult = {
  assignments: MatchScheduleAssignment[];
};
