import { ClipboardList } from 'lucide-react';
import { cookies } from 'next/headers';
import { getMatches } from '@/lib/mongo-service';
import type { Match } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage } from '@/lib/i18n';

export const revalidate = 60;

export default async function ResultsPage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  let results: Match[] = [];

  try {
    const allMatches = await getMatches();
    results = allMatches
      .filter((match) => match.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    results = [];
  }

  const rounds = results.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.round || 'TBD';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in">
      <section className="panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-green)]">{t.results.kicker}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{t.results.title}</h1>
            <p className="page-subtitle mt-3">
              {t.results.subtitle}
            </p>
          </div>
          <div className="status-pill status-completed">{t.results.resultsCount(results.length)}</div>
        </div>
      </section>

      {Object.keys(rounds).length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{t.results.noCompletedMatches}</div>
      ) : (
        Object.entries(rounds).map(([round, matches]) => (
          <section key={round} className="space-y-3">
            <div className="flex items-center gap-3">
              <ClipboardList size={18} className="text-[var(--accent-amber)]" />
              <h2 className="text-2xl font-semibold">{round}</h2>
            </div>

            <div className="space-y-3 stagger">
              {matches.map((match) => {
                const p1Won = (match.score1 ?? 0) > (match.score2 ?? 0);
                const p2Won = (match.score2 ?? 0) > (match.score1 ?? 0);

                return (
                  <div key={match.id} className="panel p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{match.date}{match.venue ? ` · ${match.venue}` : ''}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <span className={`text-lg font-semibold ${p1Won ? 'text-[var(--accent-green)]' : 'text-white/85'}`}>
                            {match.player1Name}
                          </span>
                          <span className="text-white/28">vs</span>
                          <span className={`text-lg font-semibold ${p2Won ? 'text-[var(--accent-green)]' : 'text-white/85'}`}>
                            {match.player2Name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.08)] px-5 py-3 font-mono text-3xl font-bold text-[var(--accent-gold)]">
                          {match.score1} <span className="text-white/30">:</span> {match.score2}
                        </div>
                        <span className="status-pill status-completed">{t.results.final}</span>
                      </div>
                    </div>

                    {match.notes && <p className="mt-4 text-sm italic text-white/56">{match.notes}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
