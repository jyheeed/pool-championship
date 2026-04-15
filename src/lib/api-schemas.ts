import { z } from 'zod';

const requiredText = (field: string, max = 120) =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} is too long`);

const optionalText = (max = 200) => z.string().trim().max(max, 'Value is too long').optional();

export const loginSchema = z.object({
  username: requiredText('Username', 64),
  password: requiredText('Password', 128),
});

export const playerRowSchema = z.object({
  id: requiredText('ID', 64),
  name: requiredText('Name', 120),
  nickname: optionalText(120),
  nationality: optionalText(80),
  age: z.union([z.string(), z.number()]).optional(),
  club: optionalText(120),
  photo_url: z.string().trim().max(200000, 'Photo is too large').optional(),
  pool_group: optionalText(32),
  is_seeded: z.union([z.literal('true'), z.literal('false')]).optional(),
});

export const matchRowSchema = z.object({
  id: requiredText('ID', 64),
  round: requiredText('Round', 80),
  date: requiredText('Date', 40),
  time: optionalText(40),
  venue: optionalText(120),
  player1_id: requiredText('Player 1', 64),
  player2_id: requiredText('Player 2', 64),
  score1: z.union([z.string(), z.number()]).optional(),
  score2: z.union([z.string(), z.number()]).optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'postponed']).optional(),
  frame_scores: optionalText(120),
  notes: optionalText(300),
  discipline: z.enum(['8-ball', '9-ball', '10-ball']).optional(),
});

export const clubRowSchema = z.object({
  id: requiredText('ID', 64),
  name: requiredText('Name', 120),
  city: optionalText(120),
  logo_url: optionalText(500),
});

export const tournamentSettingsSchema = z.object({
  name: requiredText('Name', 160),
  season: requiredText('Season', 32),
  pointsWin: z.coerce.number().int().min(0).max(20),
  pointsLoss: z.coerce.number().int().min(0).max(20),
  logo: optionalText(500),
  heroTitle: optionalText(200),
  heroSubtitle: optionalText(280),
});

export const drawSchema = z.object({
  groupNames: z.array(requiredText('Group name', 32)).min(1, 'At least one group name is required'),
});

export const registrationStatusUpdateSchema = z.object({
  id: requiredText('ID', 64),
  status: z.enum(['approved', 'rejected']),
});

export const registerSchema = z.object({
  name: requiredText('Name', 120),
  nickname: optionalText(120),
  nationality: requiredText('Nationality', 80),
  age: z.coerce.number().int().min(5, 'Age is required').max(99, 'Age is invalid'),
  email: z.string().trim().email('Email is invalid'),
  phone: requiredText('Phone', 40),
  city: requiredText('City', 120),
  cin: optionalText(40),
  club: optionalText(120),
  photoUrl: z.string().trim().max(200000, 'Photo is too large').optional(),
}).superRefine((value, context) => {
  if (value.age >= 18 && !value.cin?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cin'],
      message: 'CIN is required for players 18 and older',
    });
  }
});

export const scoreUpdateSchema = z.object({
  score1: z.coerce.number().int().min(0),
  score2: z.coerce.number().int().min(0),
  status: z.enum(['scheduled', 'live', 'completed', 'postponed']),
  frameScores: optionalText(120),
});
