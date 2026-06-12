'use client';

import { KnockoutMatchCard, type KnockoutMatchView } from './KnockoutMatchCard';

export type { KnockoutMatchView } from './KnockoutMatchCard';

type KnockoutBracketViewProps = {
  matches: KnockoutMatchView[];
  playerNameById: Map<string, string>;
  emptyMessage?: string;
  editable?: boolean;
  onSaveScore?: (matchId: string, score1: number, score2: number) => Promise<void> | void;
};

function normalizeRoundKey(roundNumber?: number | null, roundName?: string): number {
  if (typeof roundNumber === 'number' && Number.isFinite(roundNumber)) {
    return roundNumber;
  }

  const label = (roundName || '').toLowerCase();
  if (label.includes('round of 128')) return 1;
  if (label.includes('round of 64')) return 2;
  if (label.includes('round of 32')) return 3;
  if (label.includes('round of 16')) return 4;
  if (label.includes('quarter')) return 5;
  if (label.includes('semi')) return 6;
  if (label.includes('final')) return 7;
  return 99;
}

function normalizeRoundLabel(roundName: string): string {
  const trimmed = roundName.trim();
  const withoutMatchSuffix = trimmed.replace(/\s+\d+$/, '');
  return withoutMatchSuffix || trimmed;
}

function getRoundSpacingClass(roundIndex: number): string {
  if (roundIndex === 0) return 'space-y-3';
  if (roundIndex === 1) return 'space-y-5';
  if (roundIndex === 2) return 'space-y-7';
  return 'space-y-9';
}

function getStatusSummary(matches: KnockoutMatchView[]) {
  const roundKeys = matches.map((match) => normalizeRoundKey(match.roundNumber, match.round));
  const firstRoundKey = Math.min(...roundKeys);
  const firstRoundMatches = matches.filter((match) => normalizeRoundKey(match.roundNumber, match.round) === firstRoundKey);
  const bracketSize = Math.max(2, firstRoundMatches.length * 2);
  const players = new Set<string>();

  let byes = 0;
  let pending = 0;
  let completed = 0;

  for (const match of matches) {
    if (normalizeRoundKey(match.roundNumber, match.round) === firstRoundKey) {
      if (match.player1Id !== 'X') players.add(match.player1Id);
      if (match.player2Id !== 'X') players.add(match.player2Id);

      if (match.player1Id === 'X') byes += 1;
      if (match.player2Id === 'X') byes += 1;
    }

    if (match.status === 'pending') pending += 1;
    if (match.status === 'completed') completed += 1;
  }

  return {
    bracketSize,
    playerCount: players.size,
    byes,
    pending,
    completed,
  };
}

export function KnockoutBracketView({ matches, playerNameById, emptyMessage = 'No knockout bracket yet.', editable = false, onSaveScore }: KnockoutBracketViewProps) {
  if (matches.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-white/60">{emptyMessage}</div>;
  }

  const summary = getStatusSummary(matches);

  const rounds = Array.from(
    matches.reduce<Map<string, { key: number; label: string; matches: KnockoutMatchView[] }>>((acc, match) => {
      const key = normalizeRoundKey(match.roundNumber, match.round);
      const label = normalizeRoundLabel(match.round);
      const mapKey = `${key}:${label}`;

      if (!acc.has(mapKey)) {
        acc.set(mapKey, { key, label, matches: [] });
      }

      acc.get(mapKey)!.matches.push(match);
      return acc;
    }, new Map()).values()
  ).sort((left, right) => left.key - right.key || left.label.localeCompare(right.label));

  for (const round of rounds) {
    round.matches.sort((left, right) => (left.matchNumber ?? 0) - (right.matchNumber ?? 0) || left.id.localeCompare(right.id));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Normal Knockout Draw</p>
            <p className="mt-1 text-sm text-white/65">BYE means the player is automatically qualified to the next round.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <StatPill label="Bracket size" value={summary.bracketSize} />
            <StatPill label="Players" value={summary.playerCount} />
            <StatPill label="Byes" value={summary.byes} />
            <StatPill label="Pending" value={summary.pending} />
            <StatPill label="Completed" value={summary.completed} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-max gap-6 pr-2" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(280px, 1fr))` }}>
        {rounds.map((round) => (
          <section key={`${round.key}:${round.label}`} className="relative min-w-[280px] rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="pointer-events-none absolute right-[-1.1rem] top-1/2 hidden h-px w-5 -translate-y-1/2 bg-gradient-to-r from-white/20 to-transparent xl:block" />
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Round</p>
                <h3 className="mt-1 text-lg font-semibold text-white/90">{round.label}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                {round.matches.length} match{round.matches.length > 1 ? 'es' : ''}
              </span>
            </div>

            <div className={`mt-4 ${getRoundSpacingClass(round.key)}`}>
              {round.matches.map((match) => (
                <KnockoutMatchCard
                  key={match.id}
                  match={match}
                  playerNameById={playerNameById}
                  editable={editable}
                  onSaveScore={onSaveScore}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-white/90">{value}</div>
    </div>
  );
}