// ── Domain Types ──

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  nationality: string;
  age?: number;
  club?: string;
  photoUrl?: string;
  isSeeded?: boolean;
  wins: number;
  losses: number;
  played: number;
  points: number;
  framesWon: number;
  framesLost: number;
  frameDiff: number;
  highestBreak?: number;
  poolGroup?: string;
}

export interface Match {
  id: string;
  round: string;
  date: string;
  time?: string;
  venue?: string;
  player1Id: string;
  player2Id: string;
  player1Name?: string;
  player2Name?: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  frameScores?: string;
  notes?: string;
  discipline?: '8-ball' | '9-ball' | '10-ball';
}

export interface Standing {
  rank: number;
  player: Player;
  form: ('W' | 'L')[];
}

export interface HeadToHead {
  player1: Player;
  player2: Player;
  matches: Match[];
  player1Wins: number;
  player2Wins: number;
  totalFrames1: number;
  totalFrames2: number;
}

export interface TournamentSettings {
  name: string;
  season: string;
  pointsWin: number;
  pointsLoss: number;
  logo?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  fixtureEvents?: FixtureEvent[];
  venues?: string[];
}

export interface FixtureEvent {
  id: string;
  title: string;
  date: string;
  note: string;
  venue?: string;
}

export interface Club {
  id: string;
  name: string;
  city?: string;
  logoUrl?: string;
}

export interface PlayerProfile {
  player: Player;
  matches: Match[];
  recentMatches: Match[];
}

export interface Registration {
  id: string;
  name: string;
  nickname?: string;
  nationality: string;
  age?: number;
  email: string;
  phone: string;
  city: string;
  cin?: string;
  club?: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

// ── API Payload Row Mappings ──

export interface RegistrationRow {
  [key: string]: string;
  id: string;
  name: string;
  nickname: string;
  nationality: string;
  age: string;
  email: string;
  phone: string;
  city: string;
  cin: string;
  club: string;
  photo_url: string;
  status: string;
  created_at: string;
}

export interface PlayerRow {
  [key: string]: string;
  id: string;
  name: string;
  nickname: string;
  nationality: string;
  age: string;
  club: string;
  photo_url: string;
  pool_group: string;
  is_seeded: string;
}

export interface MatchRow {
  [key: string]: string;
  id: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  player1_id: string;
  player2_id: string;
  score1: string;
  score2: string;
  status: string;
  frame_scores: string;
  notes: string;
  discipline: string;
}

export interface SettingsRow {
  [key: string]: string;
  key: string;
  value: string;
}

export interface ClubRow {
  [key: string]: string;
  id: string;
  name: string;
  city: string;
  logo_url: string;
}

// ── API Response Types ──

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

