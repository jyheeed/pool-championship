'use client';

import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Match } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, type Language } from '@/lib/i18n';

export default function ResultsPage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [results, setResults] = useState<Match[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<'group' | 'group2' | 'knockout'>('group');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const t = getTranslations(language);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem(LANGUAGE_COOKIE) ?? DEFAULT_LANGUAGE;
      setLanguage(normalizeLanguage(storedLanguage));
    }

    const loadData = async () => {
      try {
        const matchesRes = await fetch('/api/public/matches');
        const matchesData = await matchesRes.json();

        let completedMatches: Match[] = [];

        if (matchesData.success) {
          completedMatches = (matchesData.data || [])
            .filter((match: Match) => match.status === 'completed')
            .sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        setResults(completedMatches);
        // Get first group of Phase 1
        const phaseMatches = completedMatches.filter((match) => (match.phase || 'group') === 'group');
        const groups = Array.from(new Set(phaseMatches.map((match) => (match.groupName || 'Unassigned').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        setSelectedGroup(groups[0] || null);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const phaseLabels = {
    fr: {
      group: 'Phase 1',
      group2: 'Phase 2',
      knockout: 'Finale',
      section: 'Résultats',
      noPhaseData: 'Aucun résultat pour cette phase.',
      round: 'Tour',
    },
    en: {
      group: 'Phase 1',
      group2: 'Phase 2',
      knockout: 'Final',
      section: 'Results',
      noPhaseData: 'No results for this phase.',
      round: 'Round',
    },
    ar: {
      group: 'المرحلة 1',
      group2: 'المرحلة 2',
      knockout: 'النهائي',
      section: 'النتائج',
      noPhaseData: 'لا توجد نتائج لهذه المرحلة.',
      round: 'الدور',
    },
  }[language];

  function firstGroupForPhase(phase: 'group' | 'group2' | 'knockout'): string | null {
    const phaseMatches = results.filter((match) => (match.phase || 'group') === phase);
    const groups = Array.from(new Set(phaseMatches.map((match) => (match.groupName || 'Unassigned').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return groups[0] || null;
  }

  if (loading) {
    return <div className="panel p-12 text-center text-white/60">Loading results...</div>;
  }

  const filteredResults = results.filter((match) => {
    const matchPhase = match.phase || 'group';
    return matchPhase === selectedPhase;
  });

  const groupedByGroup = filteredResults.reduce<Record<string, Record<string, Match[]>>>((acc, match) => {
    const groupName = (match.groupName || 'Unassigned').trim();
    const roundKey = match.round || 'TBD';

    if (!acc[groupName]) acc[groupName] = {};
    if (!acc[groupName][roundKey]) acc[groupName][roundKey] = [];

    acc[groupName][roundKey].push(match);
    return acc;
  }, {});

  const groups = Object.keys(groupedByGroup).sort((a, b) => a.localeCompare(b));
  const selectedGroupMatches = selectedGroup ? groupedByGroup[selectedGroup] || {} : {};

  const phase1Count = results.filter((m) => (m.phase || 'group') === 'group' && m.status === 'completed').length;
  const phase2Count = results.filter((m) => m.phase === 'group2' && m.status === 'completed').length;
  const finalCount = results.filter((m) => m.phase === 'knockout' && m.status === 'completed').length;

  return (
    <div className="results-shell space-y-8 animate-in lg:space-y-10">
      <section className="results-hero panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-green)]">{t.results.kicker}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{t.results.title}</h1>
            <p className="page-subtitle mt-3">
              {t.results.subtitle}
            </p>
          </div>
        </div>

        <div className="results-status-strip mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Phase 1</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-[var(--accent-gold)]">{phase1Count}</p>
          </div>
          <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Phase 2</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-[var(--accent-gold)]">{phase2Count}</p>
          </div>
          <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Finale</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-[var(--accent-gold)]">{finalCount}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={18} className="text-[var(--accent-blue)]" />
          <h2 className="text-2xl font-semibold">{phaseLabels.section}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['group', 'group2', 'knockout'] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => {
                setSelectedPhase(phase);
                setSelectedGroup(firstGroupForPhase(phase));
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedPhase === phase
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {phaseLabels[phase]}
            </button>
          ))}
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{phaseLabels.noPhaseData}</div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <ClipboardList size={18} className="text-[var(--accent-blue)]" />
              <h2 className="text-2xl font-semibold">Groupes</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    selectedGroup === group
                      ? 'bg-[var(--accent-gold)] text-black'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </section>

          {selectedGroup && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className="text-[var(--accent-amber)]" />
                <h2 className="text-2xl font-semibold">{selectedGroup}</h2>
                <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {Object.values(selectedGroupMatches).reduce((sum, list) => sum + list.length, 0)} résultats
                </span>
              </div>

              {Object.keys(selectedGroupMatches).length === 0 ? (
                <div className="panel p-6 text-sm text-white/60">{phaseLabels.noPhaseData}</div>
              ) : (
                Object.entries(selectedGroupMatches).map(([round, matches]) => (
                  <div key={`${selectedGroup}-${round}`} className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{phaseLabels.round} {round}</h3>

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
            </section>
          )}
        </>
      )}
    </div>
  );
}
