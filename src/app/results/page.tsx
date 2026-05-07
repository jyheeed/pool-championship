import { ClipboardList } from 'lucide-react';
import { cookies } from 'next/headers';
import { getMatches } from '@/lib/mongo-service';
import type { Match } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
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

  const phaseLabels = {
    fr: {
      phase1: 'Phase 1 - Poules',
      phase2: 'Phase 2 - Poules',
      final: 'Phase Finale',
      noResults: 'Aucun résultat pour cette phase.',
      round: 'Tour',
    },
    en: {
      phase1: 'Phase 1 - Group Stage',
      phase2: 'Phase 2 - Group Stage',
      final: 'Final Phase',
      noResults: 'No results for this phase yet.',
      round: 'Round',
    },
    ar: {
      phase1: 'المرحلة 1 - المجموعات',
      phase2: 'المرحلة 2 - المجموعات',
      final: 'المرحلة النهائية',
      noResults: 'لا توجد نتائج لهذه المرحلة بعد.',
      round: 'الدور',
    },
  }[language];

  const phaseGroups = [
    { id: 'phase1', title: phaseLabels.phase1, matches: results.filter((match) => (match.phase || 'group') === 'group') },
    { id: 'phase2', title: phaseLabels.phase2, matches: results.filter((match) => match.phase === 'group2') },
    { id: 'final', title: phaseLabels.final, matches: results.filter((match) => match.phase === 'knockout') },
  ];

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
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {phaseGroups.map((phase) => (
            <a
              key={phase.id}
              href={`#${phase.id}`}
              className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{phase.title}</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[var(--accent-gold)]">{phase.matches.length}</p>
            </a>
          ))}
        </div>
      </section>

      {results.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{t.results.noCompletedMatches}</div>
      ) : (
        phaseGroups.map((phase) => {
          const groupedByGroup = phase.matches.reduce<Record<string, Match[]>>((acc, match) => {
            const groupName = (match.groupName || 'Unassigned').trim();
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(match);
            return acc;
          }, {});

          const groups = Object.keys(groupedByGroup).sort((a, b) => a.localeCompare(b));

          return (
            <section id={phase.id} key={phase.id} className="space-y-6 scroll-mt-24">
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className="text-[var(--accent-amber)]" />
                <h2 className="text-2xl font-semibold">{phase.title}</h2>
                <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/60">{phase.matches.length}</span>
              </div>

              {groups.length === 0 ? (
                <div className="panel p-6 text-sm text-white/60">{phaseLabels.noResults}</div>
              ) : (
                groups.map((group) => {
                  const groupMatches = groupedByGroup[group] || [];
                  const rounds = groupMatches.reduce<Record<string, Match[]>>((acc, match) => {
                    const key = match.round || 'TBD';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(match);
                    return acc;
                  }, {});

                  return (
                    <div key={`${phase.id}-${group}`} className="space-y-4">
                      <h3 className="text-xl font-semibold text-white/85 border-b border-white/12 pb-3">{group}</h3>

                      {Object.keys(rounds).length === 0 ? (
                        <div className="panel p-6 text-sm text-white/60">{phaseLabels.noResults}</div>
                      ) : (
                        Object.entries(rounds).map(([round, matches]) => (
                          <div key={`${phase.id}-${group}-${round}`} className="space-y-3">
                            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{phaseLabels.round} {round}</h4>

                            <div className="space-y-3 stagger">
                              {matches.map((match) => {
                                const p1Won = (match.score1 ?? 0) > (match.score2 ?? 0);
                                const p2Won = (match.score2 ?? 0) > (match.score1 ?? 0);

                                return (
                                  <div key={match.id} className="panel p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="flex-1">
                                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{match.date}{match.venue ? ` - ${match.venue}` : ''}</p>
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
                          </div>
                        ))
                      )}
                    </div>
                  );
                })
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
