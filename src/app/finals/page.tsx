import { Brackets } from 'lucide-react';
import { cookies } from 'next/headers';
import { getMatches } from '@/lib/mongo-service';
import type { Match } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

function translateWinnerLabel(language: 'fr' | 'en' | 'ar', roundType: 'match' | 'quarter' | 'semi' | 'final', index: number): string {
  const nextIndex = Number.isFinite(index) && index > 0 ? index : 1;

  if (language === 'fr') {
    if (roundType === 'match') return `Vainqueur match ${nextIndex}`;
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

  if (roundType === 'match') return `Winner of match ${nextIndex}`;
  if (roundType === 'quarter') return `Winner of quarter-final ${nextIndex}`;
  if (roundType === 'semi') return `Winner of semi-final ${nextIndex}`;
  return 'Winner of the final';
}

function formatKnockoutParticipantLabel(language: 'fr' | 'en' | 'ar', participantId: string, fallbackName?: string): string {
  if (fallbackName) return fallbackName;

  const directMatch = participantId.match(/^WINNER_ko-r16-(\d+)$/);
  if (directMatch) {
    return translateWinnerLabel(language, 'match', Number(directMatch[1]));
  }

  const quarterMatch = participantId.match(/^WINNER_ko-qf-(\d+)$/);
  if (quarterMatch) {
    return translateWinnerLabel(language, 'quarter', Number(quarterMatch[1]));
  }

  const semiMatch = participantId.match(/^WINNER_ko-sf-(\d+)$/);
  if (semiMatch) {
    return translateWinnerLabel(language, 'semi', Number(semiMatch[1]));
  }

  if (participantId === 'WINNER_ko-final-1') {
    return translateWinnerLabel(language, 'final', 1);
  }

  return participantId;
}

function roundOrder(round: string): number {
  const value = round.toLowerCase();
  if (value.includes('round of 16')) return 0;
  if (value.includes('quarter')) return 1;
  if (value.includes('semi')) return 2;
  if (value.includes('final')) return 3;
  return 4;
}

export default async function FinalsPage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);

  let knockoutMatches: Match[] = [];

  try {
    const allMatches = await getMatches();
    knockoutMatches = allMatches
      .filter((match) => match.phase === 'knockout')
      .sort((a, b) => {
        const byRound = roundOrder(a.round || '') - roundOrder(b.round || '');
        if (byRound !== 0) return byRound;
        return (a.id || '').localeCompare(b.id || '');
      });
  } catch {
    knockoutMatches = [];
  }

  const label = {
    fr: {
      kicker: 'Phase finale',
      title: 'Bracket final',
      subtitle: 'Suivez les quarts de finale, demi-finales et finale du championnat.',
      empty: 'Le bracket final n\'est pas encore généré.',
      status: 'Statut',
    },
    en: {
      kicker: 'Final phase',
      title: 'Final bracket',
      subtitle: 'Track quarter-finals, semi-finals, and the grand final.',
      empty: 'The final bracket is not generated yet.',
      status: 'Status',
    },
    ar: {
      kicker: 'المرحلة النهائية',
      title: 'القوس النهائي',
      subtitle: 'تابع ربع النهائي ونصف النهائي والنهائي.',
      empty: 'لم يتم إنشاء القوس النهائي بعد.',
      status: 'الحالة',
    },
  }[language];

  return (
    <div className="space-y-8 animate-in">
      <section className="panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-gold)]">{label.kicker}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{label.title}</h1>
            <p className="page-subtitle mt-3">{label.subtitle}</p>
          </div>
        </div>
      </section>

      {knockoutMatches.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{label.empty}</div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Brackets size={18} className="text-[var(--accent-gold)]" />
            <h2 className="text-2xl font-semibold">{label.title}</h2>
          </div>

          <div className="space-y-3 stagger">
            {knockoutMatches.map((match) => (
              <div key={match.id} className="panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">{match.round}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-lg font-semibold text-white/90">{formatKnockoutParticipantLabel(language, match.player1Id, match.player1Name)}</span>
                      <span className="text-white/28">vs</span>
                      <span className="text-lg font-semibold text-white/90">{formatKnockoutParticipantLabel(language, match.player2Id, match.player2Name)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.08)] px-5 py-3 font-mono text-3xl font-bold text-[var(--accent-gold)]">
                      {(match.score1 ?? '-')} <span className="text-white/30">:</span> {(match.score2 ?? '-')}
                    </div>
                    <span className="status-pill status-live">{label.status}: {match.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
