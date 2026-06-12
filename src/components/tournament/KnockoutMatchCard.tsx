'use client';

import { useEffect, useMemo, useState } from 'react';

export type KnockoutMatchView = {
  id: string;
  round: string;
  roundNumber?: number | null;
  matchNumber?: number | null;
  player1Id: string;
  player2Id: string;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'pending' | 'bye';
  winnerId?: string | null;
  score1?: number | null;
  score2?: number | null;
};

export type PlayerDisplay = {
  name: string;
  badge?: string;
  muted?: boolean;
};

export function getRoundDisplayName(roundName: string, roundNumber?: number | null): string {
  const normalized = roundName.trim().replace(/\s+\d+$/, '');
  if (normalized) return normalized;

  if (roundNumber === 1) return 'Round 1';
  return `Round ${roundNumber ?? '-'}`;
}

export function getPlayerDisplayName(playerId: string, playerName?: string): PlayerDisplay {
  if (playerName && playerName.trim()) {
    return { name: playerName.trim(), muted: playerName.trim() === 'X', badge: playerName.trim() === 'X' ? 'Empty slot' : undefined };
  }

  if (playerId === 'X') {
    return { name: 'X', badge: 'Empty slot', muted: true };
  }

  const genericWinnerMatch = playerId.match(/^WINNER_ko-r(\d+)-(\d+)$/);
  if (genericWinnerMatch) {
    const roundSize = Number(genericWinnerMatch[1]);
    const matchNumber = genericWinnerMatch[2];

    if (roundSize === 16) return { name: `Winner of match ${matchNumber}` };
    if (roundSize === 8) return { name: `Winner of quarter-final ${matchNumber}` };
    if (roundSize === 4) return { name: `Winner of semi-final ${matchNumber}` };
    if (roundSize === 2) return { name: 'Winner of the final' };

    return { name: `Winner of round of ${roundSize} match ${matchNumber}` };
  }

  const directMatch = playerId.match(/^WINNER_ko-r16-(\d+)$/);
  if (directMatch) return { name: `Winner of match ${directMatch[1]}` };

  const quarterMatch = playerId.match(/^WINNER_ko-qf-(\d+)$/);
  if (quarterMatch) return { name: `Winner of quarter-final ${quarterMatch[1]}` };

  const semiMatch = playerId.match(/^WINNER_ko-sf-(\d+)$/);
  if (semiMatch) return { name: `Winner of semi-final ${semiMatch[1]}` };

  if (playerId === 'WINNER_ko-final-1') return { name: 'Winner of the final' };

  return { name: playerId };
}

export function formatMatchStatus(match: KnockoutMatchView): { label: string; tone: string } {
  switch (match.status) {
    case 'bye':
      return {
        label: 'BYE',
        tone: 'border-[rgba(71,198,140,0.35)] bg-[rgba(71,198,140,0.12)] text-[var(--accent-green)]',
      };
    case 'pending':
      return {
        label: 'Pending',
        tone: 'border-white/12 bg-white/8 text-white/70',
      };
    case 'completed':
      return {
        label: 'Completed',
        tone: 'border-[rgba(71,198,140,0.35)] bg-[rgba(71,198,140,0.12)] text-[var(--accent-green)]',
      };
    case 'live':
      return {
        label: 'Live',
        tone: 'border-[rgba(48,183,255,0.35)] bg-[rgba(48,183,255,0.12)] text-[var(--accent-blue)]',
      };
    case 'postponed':
      return {
        label: 'Postponed',
        tone: 'border-[rgba(255,145,0,0.35)] bg-[rgba(255,145,0,0.12)] text-[#ffb86b]',
      };
    default:
      return {
        label: 'Scheduled',
        tone: 'border-white/12 bg-white/8 text-white/70',
      };
  }
}

type KnockoutMatchCardProps = {
  match: KnockoutMatchView;
  playerNameById: Map<string, string>;
  editable?: boolean;
  onSaveScore?: (matchId: string, score1: number, score2: number) => Promise<void> | void;
};

export function KnockoutMatchCard({ match, playerNameById, editable = false, onSaveScore }: KnockoutMatchCardProps) {
  const status = formatMatchStatus(match);
  const player1 = getPlayerDisplayName(match.player1Id, playerNameById.get(match.player1Id));
  const player2 = getPlayerDisplayName(match.player2Id, playerNameById.get(match.player2Id));
  const hasOneRealPlayer = player1.name !== 'X' || player2.name !== 'X';
  const qualifiedPlayerName = player1.name !== 'X' ? player1.name : player2.name;
  const winnerName = match.winnerId ? getPlayerDisplayName(match.winnerId, playerNameById.get(match.winnerId)).name : null;
  const player1IsWinner = match.winnerId === match.player1Id || (match.status === 'bye' && player1.name !== 'X');
  const player2IsWinner = match.winnerId === match.player2Id || (match.status === 'bye' && player2.name !== 'X');
  const loserName = useMemo(() => {
    if (player1IsWinner) return player2.name;
    if (player2IsWinner) return player1.name;
    return null;
  }, [player1.name, player1IsWinner, player2.name, player2IsWinner]);
  const [score1Draft, setScore1Draft] = useState(String(match.score1 ?? ''));
  const [score2Draft, setScore2Draft] = useState(String(match.score2 ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setScore1Draft(String(match.score1 ?? ''));
    setScore2Draft(String(match.score2 ?? ''));
  }, [match.id, match.score1, match.score2]);

  async function handleSave() {
    if (!onSaveScore) return;

    if (score1Draft.trim() === '' || score2Draft.trim() === '') {
      setSaveError('Both scores are required');
      return;
    }

    const score1 = Number(score1Draft);
    const score2 = Number(score2Draft);
    if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
      setSaveError('Scores must be valid integers');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      await onSaveScore(match.id, score1, score2);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save score');
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = Boolean(onSaveScore) && !isSaving && score1Draft.trim() !== '' && score2Draft.trim() !== '';

  return (
    <article className="relative rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Match {match.matchNumber ?? '-'}</p>
          <p className="mt-1 text-sm font-semibold text-white/80">{getRoundDisplayName(match.round, match.roundNumber)}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className={`rounded-xl border px-3 py-3 ${player1IsWinner ? 'border-[rgba(71,198,140,0.35)] bg-[rgba(71,198,140,0.08)]' : 'border-white/8 bg-black/10'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${player1.muted ? 'text-white/40' : 'text-white/90'}`}>{player1.name}</span>
            {player1.badge ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
                {player1.badge}
              </span>
            ) : null}
          </div>
          {match.status === 'completed' && winnerName ? (
            <p className={`mt-2 text-[11px] uppercase tracking-[0.18em] ${player1IsWinner ? 'text-[var(--accent-green)]' : 'text-white/30'}`}>
              {player1IsWinner ? 'Winner' : 'Loser'}
            </p>
          ) : null}
        </div>

        <div className={`rounded-xl border px-3 py-3 ${player2IsWinner ? 'border-[rgba(71,198,140,0.35)] bg-[rgba(71,198,140,0.08)]' : 'border-white/8 bg-black/10'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${player2.muted ? 'text-white/40' : 'text-white/90'}`}>{player2.name}</span>
            {player2.badge ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
                {player2.badge}
              </span>
            ) : null}
          </div>
          {match.status === 'completed' && winnerName ? (
            <p className={`mt-2 text-[11px] uppercase tracking-[0.18em] ${player2IsWinner ? 'text-[var(--accent-green)]' : 'text-white/30'}`}>
              {player2IsWinner ? 'Winner' : 'Loser'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-white/8 pt-3 text-sm text-white/65">
        {match.status === 'bye' ? (
          hasOneRealPlayer ? (
            <p>
              Qualified automatically:{' '}
              <span className="font-semibold text-[var(--accent-green)]">{winnerName || qualifiedPlayerName}</span>
            </p>
          ) : (
            <p className="text-white/45">Empty bracket: no real player in this match.</p>
          )
        ) : null}

        {match.status === 'completed' && winnerName ? (
          <p>
            Winner: <span className="font-semibold text-[var(--accent-green)]">{winnerName}</span>
          </p>
        ) : null}

        {match.status === 'completed' && loserName ? (
          <p className="text-white/45">
            Loser: <span className="font-medium text-white/70">{loserName}</span>
          </p>
        ) : null}

        {match.status === 'pending' ? <p>Waiting for both players to complete the match.</p> : null}

        {match.score1 !== null && match.score2 !== null ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">
            Score: {match.score1} - {match.score2}
          </p>
        ) : null}

        {editable && onSaveScore ? (
          <div className="grid gap-2 pt-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="number"
              min={0}
              value={score1Draft}
              onChange={(e) => setScore1Draft(e.target.value)}
              placeholder="Score 1"
              className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-gold)]"
            />
            <input
              type="number"
              min={0}
              value={score2Draft}
              onChange={(e) => setScore2Draft(e.target.value)}
              placeholder="Score 2"
              className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-gold)]"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg border border-[rgba(255,194,71,0.35)] bg-[rgba(255,194,71,0.10)] px-4 py-2 text-sm font-semibold text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? 'Saving...' : 'Save score'}
            </button>
            {saveError ? <p className="sm:col-span-3 text-xs text-[#ff8f98]">{saveError}</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}