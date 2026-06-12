import Link from 'next/link';
import { Brackets } from 'lucide-react';
import { cookies } from 'next/headers';
import { getMatches } from '@/lib/mongo-service';
import type { Match } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

type PageLanguage = 'fr' | 'en' | 'ar';

type FinalsPageProps = {
  searchParams?: {
    round?: string;
  };
};

type RoundMeta = {
  slug: string;
  order: number;
  label: string;
};

function tx(language: PageLanguage, fr: string, en: string, ar: string) {
  if (language === 'en') return en;
  if (language === 'ar') return ar;
  return fr;
}

function isGeneratedParticipant(value?: string | null): boolean {
  if (!value) return false;
  return /^WINNER[_-]ko/i.test(value) || value === 'X';
}

function translateWinnerLabel(
  language: PageLanguage,
  roundType: 'match' | 'quarter' | 'semi' | 'final',
  index: number
): string {
  const nextIndex = Number.isFinite(index) && index > 0 ? index : 1;

  if (language === 'fr') {
    if (roundType === 'match') return `Vainqueur Match ${nextIndex}`;
    if (roundType === 'quarter') return `Vainqueur quart de finale ${nextIndex}`;
    if (roundType === 'semi') return `Vainqueur demi-finale ${nextIndex}`;
    return 'Vainqueur finale';
  }

  if (language === 'ar') {
    if (roundType === 'match') return `الفائز في المباراة ${nextIndex}`;
    if (roundType === 'quarter') return `الفائز في ربع النهائي ${nextIndex}`;
    if (roundType === 'semi') return `الفائز في نصف النهائي ${nextIndex}`;
    return 'الفائز في النهائي';
  }

  if (roundType === 'match') return `Winner Match ${nextIndex}`;
  if (roundType === 'quarter') return `Winner Quarter-final ${nextIndex}`;
  if (roundType === 'semi') return `Winner Semi-final ${nextIndex}`;
  return 'Winner Final';
}

function formatKnockoutParticipantLabel(
  language: PageLanguage,
  participantId?: string,
  fallbackName?: string
): string {
  const safeFallback = fallbackName?.trim();
  const safeParticipantId = participantId?.trim() || '';

  if (safeFallback && !isGeneratedParticipant(safeFallback)) {
    return safeFallback;
  }

  const value = safeFallback || safeParticipantId;

  if (!value) {
    return tx(language, 'À déterminer', 'To be decided', 'سيتم تحديده');
  }

  if (value === 'X') {
    return tx(language, 'Place vide', 'Empty slot', 'مكان فارغ');
  }

  const genericRoundMatch = value.match(/^WINNER[_-]ko[-_]r(\d+)[-_](\d+)$/i);
  if (genericRoundMatch) {
    return translateWinnerLabel(language, 'match', Number(genericRoundMatch[2]));
  }

  const quarterMatch = value.match(/^WINNER[_-]ko[-_]qf[-_](\d+)$/i);
  if (quarterMatch) {
    return translateWinnerLabel(language, 'quarter', Number(quarterMatch[1]));
  }

  const semiMatch = value.match(/^WINNER[_-]ko[-_]sf[-_](\d+)$/i);
  if (semiMatch) {
    return translateWinnerLabel(language, 'semi', Number(semiMatch[1]));
  }

  if (/^WINNER[_-]ko[-_]final[-_]1$/i.test(value)) {
    return translateWinnerLabel(language, 'final', 1);
  }

  return value;
}

function getRoundMeta(round: string, language: PageLanguage): RoundMeta {
  const value = (round || '').toLowerCase().trim();

  const roundOfMatch = value.match(/round of\s*(\d+)/i);
  if (roundOfMatch) {
    const size = Number(roundOfMatch[1]);

    const roundOrderMap: Record<number, number> = {
      256: 0,
      128: 1,
      64: 2,
      32: 3,
      16: 4,
      8: 5,
      4: 6,
      2: 7,
    };

    if (size === 8) {
      return {
        slug: 'quarter-final',
        order: 5,
        label: tx(language, 'Quarter Final', 'Quarter Final', 'ربع النهائي'),
      };
    }

    if (size === 4) {
      return {
        slug: 'semi-final',
        order: 6,
        label: tx(language, 'Semi Final', 'Semi Final', 'نصف النهائي'),
      };
    }

    if (size === 2) {
      return {
        slug: 'final',
        order: 7,
        label: tx(language, 'Final', 'Final', 'النهائي'),
      };
    }

    return {
      slug: `round-of-${size}`,
      order: roundOrderMap[size] ?? 50,
      label: `Round of ${size}`,
    };
  }

  if (value.includes('quarter') || value.includes('quart')) {
    return {
      slug: 'quarter-final',
      order: 5,
      label: tx(language, 'Quarter Final', 'Quarter Final', 'ربع النهائي'),
    };
  }

  if (value.includes('semi') || value.includes('demi')) {
    return {
      slug: 'semi-final',
      order: 6,
      label: tx(language, 'Semi Final', 'Semi Final', 'نصف النهائي'),
    };
  }

  if (value.includes('final')) {
    return {
      slug: 'final',
      order: 7,
      label: tx(language, 'Final', 'Final', 'النهائي'),
    };
  }

  return {
    slug: value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown',
    order: 99,
    label: round || tx(language, 'Tour inconnu', 'Unknown round', 'دور غير معروف'),
  };
}

function getExplicitMatchNumber(match: Match): number | null {
  const maybeMatch = match as Match & {
    matchNumber?: number;
    roundNumber?: number;
  };

  if (typeof maybeMatch.matchNumber === 'number' && maybeMatch.matchNumber > 0) {
    return maybeMatch.matchNumber;
  }

  const idMatch = match.id?.match(/ko[-_]r\d+[-_](\d+)$/i);
  if (idMatch) {
    return Number(idMatch[1]);
  }

  const genericIdMatch = match.id?.match(/(?:match|m)[-_]?(\d+)$/i);
  if (genericIdMatch) {
    return Number(genericIdMatch[1]);
  }

  return null;
}

function getMatchNumber(match: Match, fallbackIndex: number): number {
  const explicit = getExplicitMatchNumber(match);
  if (explicit) return explicit;

  const player1Winner = match.player1Id?.match(/^WINNER[_-]ko[-_]r\d+[-_](\d+)$/i);
  if (player1Winner) {
    return Math.ceil(Number(player1Winner[1]) / 2);
  }

  const player2Winner = match.player2Id?.match(/^WINNER[_-]ko[-_]r\d+[-_](\d+)$/i);
  if (player2Winner) {
    return Math.ceil(Number(player2Winner[1]) / 2);
  }

  return fallbackIndex + 1;
}

function getStatusClass(status: string): string {
  const value = status.toLowerCase();

  if (value === 'completed') {
    return 'border-green-400/25 bg-green-500/10 text-green-300';
  }

  if (value === 'bye') {
    return 'border-[rgba(255,194,71,0.25)] bg-[rgba(255,194,71,0.12)] text-[var(--accent-gold)]';
  }

  return 'border-red-400/20 bg-red-500/10 text-red-300';
}

function formatStatus(language: PageLanguage, status: string): string {
  const value = status.toLowerCase();

  if (value === 'completed') {
    return tx(language, 'Terminé', 'Completed', 'مكتمل');
  }

  if (value === 'bye') {
    return tx(language, 'BYE', 'BYE', 'تأهل تلقائي');
  }

  return tx(language, 'En attente', 'Pending', 'في الانتظار');
}

function formatScore(score?: number | null): string {
  return typeof score === 'number' ? String(score) : '-';
}

export default async function FinalsPage({ searchParams }: FinalsPageProps) {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);

  let knockoutMatches: Match[] = [];

  try {
    const allMatches = await getMatches();

    knockoutMatches = allMatches
      .filter((match) => match.phase === 'knockout')
      .sort((a, b) => {
        const roundA = getRoundMeta(a.round || '', language);
        const roundB = getRoundMeta(b.round || '', language);

        if (roundA.order !== roundB.order) {
          return roundA.order - roundB.order;
        }

        const matchNumberA = getMatchNumber(a, 0);
        const matchNumberB = getMatchNumber(b, 0);

        if (matchNumberA !== matchNumberB) {
          return matchNumberA - matchNumberB;
        }

        return (a.id || '').localeCompare(b.id || '');
      });
  } catch {
    knockoutMatches = [];
  }

  const label = {
    fr: {
      kicker: 'Phase finale',
      title: 'Tirage tournoi',
      subtitle:
        'Suivez le tableau knockout du championnat, round par round, avec la planification des matchs.',
      empty: 'Le tirage tournoi n’est pas encore généré.',
      status: 'Statut',
      matches: 'matchs',
      planning: 'Planification des matchs',
      score: 'Score',
      noMatchesInRound: 'Aucun match dans ce round.',
    },
    en: {
      kicker: 'Final phase',
      title: 'Tournament Draw',
      subtitle:
        'Track the knockout bracket round by round with clear match planning.',
      empty: 'The tournament draw is not generated yet.',
      status: 'Status',
      matches: 'matches',
      planning: 'Match planning',
      score: 'Score',
      noMatchesInRound: 'No matches in this round.',
    },
    ar: {
      kicker: 'المرحلة النهائية',
      title: 'سحب البطولة',
      subtitle: 'تابع جدول خروج المغلوب دورًا بدور مع تنظيم واضح للمباريات.',
      empty: 'لم يتم إنشاء سحب البطولة بعد.',
      status: 'الحالة',
      matches: 'مباريات',
      planning: 'تخطيط المباريات',
      score: 'النتيجة',
      noMatchesInRound: 'لا توجد مباريات في هذا الدور.',
    },
  }[language];

  const roundTabs = knockoutMatches.reduce<RoundMeta[]>((acc, match) => {
    const meta = getRoundMeta(match.round || '', language);
    const exists = acc.some((item) => item.slug === meta.slug);

    if (!exists) {
      acc.push(meta);
    }

    return acc;
  }, []);

  roundTabs.sort((a, b) => a.order - b.order);

  const requestedRound = searchParams?.round;
  const activeRound =
    roundTabs.find((round) => round.slug === requestedRound) ?? roundTabs[0];

  const activeMatches = activeRound
    ? knockoutMatches
        .filter((match) => getRoundMeta(match.round || '', language).slug === activeRound.slug)
        .sort((a, b) => getMatchNumber(a, 0) - getMatchNumber(b, 0))
    : [];

  return (
    <div className="space-y-8 animate-in">
      <section className="panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-gold)]">{label.kicker}</p>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{label.title}</h1>
            <p className="page-subtitle mt-3">{label.subtitle}</p>
          </div>

          {knockoutMatches.length > 0 && (
            <div className="rounded-2xl border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.08)] px-4 py-3 text-sm text-[var(--accent-gold)]">
              {knockoutMatches.length} {label.matches}
            </div>
          )}
        </div>
      </section>

      {knockoutMatches.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{label.empty}</div>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Brackets size={18} className="text-[var(--accent-gold)]" />
            <h2 className="text-2xl font-semibold">{label.planning}</h2>
          </div>

          <div className="panel p-3">
            <div className="flex flex-wrap gap-2">
              {roundTabs.map((round) => {
                const isActive = activeRound?.slug === round.slug;
                const count = knockoutMatches.filter(
                  (match) => getRoundMeta(match.round || '', language).slug === round.slug
                ).length;

                return (
                  <Link
                    key={round.slug}
                    href={`/finals?round=${round.slug}`}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                      isActive
                        ? 'border-[rgba(255,194,71,0.45)] bg-[var(--accent-gold)] text-black'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-[rgba(255,194,71,0.35)] hover:text-white'
                    }`}
                  >
                    {round.label}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {activeRound && (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker text-[var(--accent-gold)]">
                  {activeRound.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  {label.planning}
                </h3>
              </div>
              <div className="text-sm text-white/45">
                {activeMatches.length} {label.matches}
              </div>
            </div>
          )}

          {activeMatches.length === 0 ? (
            <div className="panel p-8 text-center text-white/50">
              {label.noMatchesInRound}
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {activeMatches.map((match, index) => {
                const matchNumber = getMatchNumber(match, index);
                const player1Label = formatKnockoutParticipantLabel(
                  language,
                  match.player1Id,
                  match.player1Name
                );
                const player2Label = formatKnockoutParticipantLabel(
                  language,
                  match.player2Id,
                  match.player2Name
                );

                const winnerId = (match as Match & { winnerId?: string }).winnerId;
                const isPlayer1Winner =
                  match.status === 'completed' &&
                  winnerId &&
                  winnerId === match.player1Id;
                const isPlayer2Winner =
                  match.status === 'completed' &&
                  winnerId &&
                  winnerId === match.player2Id;

                return (
                  <article key={match.id} className="panel overflow-hidden">
                    <div className="grid gap-0 lg:grid-cols-[150px_1fr_190px_170px]">
                      <div className="border-b border-white/10 bg-white/[0.025] p-5 lg:border-b-0 lg:border-r">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                          Match
                        </p>
                        <p className="mt-2 text-3xl font-black text-[var(--accent-gold)]">
                          {matchNumber}
                        </p>
                      </div>

                      <div className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                          {activeRound?.label || match.round}
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                          <div
                            className={`rounded-2xl border px-4 py-3 ${
                              isPlayer1Winner
                                ? 'border-green-400/30 bg-green-500/10 text-green-200'
                                : 'border-white/10 bg-white/[0.03] text-white/85'
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                              Joueur 1
                            </p>
                            <p className="mt-1 text-lg font-bold">{player1Label}</p>
                          </div>

                          <span className="text-center text-sm font-bold uppercase tracking-[0.18em] text-white/35">
                            vs
                          </span>

                          <div
                            className={`rounded-2xl border px-4 py-3 ${
                              isPlayer2Winner
                                ? 'border-green-400/30 bg-green-500/10 text-green-200'
                                : 'border-white/10 bg-white/[0.03] text-white/85'
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                              Joueur 2
                            </p>
                            <p className="mt-1 text-lg font-bold">{player2Label}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center border-t border-white/10 p-5 lg:border-l lg:border-t-0">
                        <div>
                          <p className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-white/35">
                            {label.score}
                          </p>
                          <div className="rounded-2xl border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.08)] px-5 py-3 font-mono text-3xl font-bold text-[var(--accent-gold)]">
                            {formatScore(match.score1)}
                            <span className="px-3 text-white/30">:</span>
                            {formatScore(match.score2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center border-t border-white/10 p-5 lg:border-l lg:border-t-0">
                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${getStatusClass(
                            match.status
                          )}`}
                        >
                          {label.status}: {formatStatus(language, match.status)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}