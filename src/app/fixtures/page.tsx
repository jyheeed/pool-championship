'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Match, Standing, TournamentSettings } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, translateStatus, type Language } from '@/lib/i18n';
import { getPhase1Label, phase1GroupOrder } from '@/lib/group-labels';

type FixtureEvent = {
  id: string;
  title: string;
  date: string;
  note: string;
  venue?: string;
};

function formatDateOnly(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export default function FixturesPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<'group' | 'group2' | 'knockout'>('group2');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const t = getTranslations(language);

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;

  function firstGroupForPhase(phase: 'group' | 'group2' | 'knockout'): string | null {
    const phaseMatches = fixtures.filter((match) => (match.phase || 'group') === phase);
    const groups = Array.from(new Set(phaseMatches.map((match) => (match.groupName || 'Unassigned').trim()).filter(Boolean))).sort((a, b) => {
      if (phase !== 'group') return a.localeCompare(b);

      const leftIndex = phase1GroupOrder.indexOf(a);
      const rightIndex = phase1GroupOrder.indexOf(b);
      if (leftIndex === -1 && rightIndex === -1) return a.localeCompare(b);
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
    return groups[0] || null;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem(LANGUAGE_COOKIE) ?? DEFAULT_LANGUAGE;
      setLanguage(normalizeLanguage(storedLanguage));
    }

    const loadData = async () => {
      try {
        const [matchesRes, settingsRes] = await Promise.all([
          fetch('/api/public/matches'),
          fetch('/api/public/settings'),
        ]);

        const matchesData = await matchesRes.json();
        const settingsData = await settingsRes.json();
        const standingsRes = await fetch('/api/public/standings');
        const standingsData = await standingsRes.json();

        let tournamentMatches: Match[] = [];

        if (matchesData.success) {
          tournamentMatches = (matchesData.data || []).filter((match: Match) => {
            const groupName = (match.groupName || '').trim();
            return match.phase === 'group' || match.phase === 'group2' || match.phase === 'knockout' || groupName.length > 0;
          });
        }

        if (tournamentMatches.length === 0 && standingsData.success) {
          const standings: Standing[] = standingsData.data || [];
          const hasGroups = standings.some((standing) => Boolean(standing.player.poolGroup?.trim()));

          if (hasGroups) {
            const generateRes = await fetch('/api/public/tournament/group-matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ replaceExisting: true }),
            });

            const generateData = await generateRes.json();
            if (generateData.success) {
              const refreshedRes = await fetch('/api/public/matches');
              const refreshedData = await refreshedRes.json();
              if (refreshedData.success) {
                tournamentMatches = (refreshedData.data || []).filter((match: Match) => {
                  const groupName = (match.groupName || '').trim();
                  return match.phase === 'group' || match.phase === 'group2' || match.phase === 'knockout' || groupName.length > 0;
                });
              }
            }
          }
        }

        setFixtures(tournamentMatches);

        const groups = Array.from(
          new Set(
            tournamentMatches
              .filter((m: Match) => (m.phase || 'group') === 'group')
              .map((m: Match) => m.groupName)
              .filter(Boolean)
          )
        ).sort((a, b) => {
          const leftIndex = phase1GroupOrder.indexOf(a as string);
          const rightIndex = phase1GroupOrder.indexOf(b as string);
          if (leftIndex === -1 && rightIndex === -1) return String(a).localeCompare(String(b));
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        });
        if (groups.length > 0) {
          setSelectedGroup(groups[0] as string);
        }

        if (settingsData.success) {
          setSettings(settingsData.data || { name: 'Pool Championship', season: '2026', pointsWin: 3, pointsLoss: 0, fixtureEvents: [], venues: [] });
        }
      } catch (error) {
        console.error('Failed to load fixtures:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="panel p-12 text-center text-white/60">Loading fixtures...</div>;
  }

  const phaseLabels = {
    fr: {
      group: 'Phase 1',
      group2: 'Phase 2',
      knockout: 'Finale',
      section: 'Phase',
      noPhaseData: 'Aucun match pour cette phase.',
    },
    en: {
      group: 'Phase 1',
      group2: 'Phase 2',
      knockout: 'Final',
      section: 'Phase',
      noPhaseData: 'No matches for this phase.',
    },
    ar: {
      group: 'المرحلة 1',
      group2: 'المرحلة 2',
      knockout: 'النهائي',
      section: 'المرحلة',
      noPhaseData: 'لا توجد مباريات لهذه المرحلة.',
    },
  }[language];

  const filteredFixtures = fixtures.filter((match) => {
    const matchPhase = match.phase || 'group';
    return matchPhase === selectedPhase;
  });

  const groupedByGroup = filteredFixtures.reduce<Record<string, Record<string, Match[]>>>((acc, match) => {
    const groupName = (match.groupName || 'Unassigned').trim();
    const roundKey = String(match.roundNumber || 0).padStart(2, '0');

    if (!acc[groupName]) acc[groupName] = {};
    if (!acc[groupName][roundKey]) acc[groupName][roundKey] = [];

    acc[groupName][roundKey].push(match);
    return acc;
  }, {});

  const groups = Object.keys(groupedByGroup).sort((a, b) => {
    if (selectedPhase !== 'group') return a.localeCompare(b);

    const leftIndex = phase1GroupOrder.indexOf(a);
    const rightIndex = phase1GroupOrder.indexOf(b);
    if (leftIndex === -1 && rightIndex === -1) return a.localeCompare(b);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
  const selectedGroupKey = selectedGroup || '';
  const selectedGroupMatches = selectedGroupKey ? groupedByGroup[selectedGroupKey] || {} : {};
  const displayGroupLabel = (groupName: string) => {
    const label = getPhase1Label(groupName);
    return selectedPhase === 'group' && label ? `${label} : ${groupName}` : groupName;
  };

  const scheduledCount = filteredFixtures.filter((m) => m.status === 'scheduled').length;
  const liveCount = filteredFixtures.filter((m) => m.status === 'live').length;
  const postponedCount = filteredFixtures.filter((m) => m.status === 'postponed').length;

  const upcomingEvents: FixtureEvent[] = (settings?.fixtureEvents && settings.fixtureEvents.length > 0)
    ? settings.fixtureEvents
    : [{
        id: 'group-stage',
        title: t.fixtures.eventOneTitle,
        date: t.fixtures.eventOneDate,
        note: t.fixtures.eventOneNote,
        venue: settings?.venues?.[0] || undefined,
      }];

  const isFr = language === 'fr';
  const totalGroupMatches = selectedGroup
    ? Object.values(selectedGroupMatches).reduce((sum, list) => sum + list.length, 0)
    : 0;

  return (
    <div className="fixtures-shell space-y-8 animate-in lg:space-y-10">
      <section className="fixtures-hero panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-blue)]">{t.fixtures.seasonKicker(settings?.season || '2026')}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{t.fixtures.title}</h1>
            <p className="page-subtitle mt-3">
              {t.fixtures.subtitle}
            </p>
          </div>
        </div>

        <div className="fixtures-status-strip mt-4 stagger" aria-label="Fixture status overview">
          <div className="fixtures-status-card">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{translateStatus(language, 'scheduled')}</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{scheduledCount}</p>
          </div>
          <div className="fixtures-status-card">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{translateStatus(language, 'live')}</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{liveCount}</p>
          </div>
          <div className="fixtures-status-card">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{translateStatus(language, 'postponed')}</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{postponedCount}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-[var(--accent-gold)]" />
          <h2 className="text-2xl font-semibold">{t.fixtures.upcomingEvents}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {upcomingEvents.map((event) => (
            <article key={event.id} className="fixtures-event-card panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t.fixtures.event}</p>
                  <h3 className="mt-2 text-xl font-semibold">{event.title}</h3>
                </div>
                <span className="status-pill status-scheduled">{event.date}</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/65">{event.note}</p>

              {event.venue && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{t.fixtures.venue}</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{event.venue}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-[var(--accent-blue)]" />
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
              <CalendarDays size={18} className="text-[var(--accent-blue)]" />
              <h2 className="text-2xl font-semibold">{t.fixtures.roundLabel}</h2>
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
                  {displayGroupLabel(group)}
                </button>
              ))}
            </div>
          </section>

          {selectedGroup && (
            <section className="space-y-4">
              <div className="fixtures-round-title flex items-center gap-3">
                <CalendarDays size={18} className="text-[var(--accent-blue)]" />
                <h2 className="text-2xl font-semibold">
                  {displayGroupLabel(selectedGroupKey)} <span className="text-base font-normal text-white/55">({totalGroupMatches} matches)</span>
                </h2>
              </div>

              <div className="space-y-6">
                {Object.entries(selectedGroupMatches)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([roundKey, matches]) => {
                    const roundNumber = Number(roundKey || '0');

                    return (
                      <div key={`${selectedGroup}-${roundKey}`} className="space-y-3">
                        <h3 className="text-lg font-semibold text-white/80">
                          {isFr ? `${t.fixtures.roundLabel} ${roundNumber > 0 ? roundNumber : '-'}` : `Round ${roundNumber > 0 ? roundNumber : '-'}`}
                        </h3>

                        <div className="space-y-3 stagger">
                          {matches.map((match) => (
                            <div key={match.id} className="fixtures-match-card panel p-5">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex-1">
                                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t.fixtures.matchCard}</p>
                                  <p className="mt-2 text-xl font-semibold">
                                    {match.player1Name} <span className="text-white/30">vs</span> {match.player2Name}
                                  </p>
                                </div>

                                <div className="text-center">
                                  <p className="font-mono text-sm text-white/58">{formatDateOnly(match.date)}</p>
                                </div>

                                <div className="flex flex-col items-start gap-2 lg:items-end">
                                  <span className={`status-pill ${match.status === 'postponed' ? 'status-postponed' : match.status === 'live' ? 'status-live' : 'status-scheduled'}`}>
                                    {translateStatus(language, match.status)}
                                  </span>
                                  {match.venue && <span className="text-sm text-white/60">{match.venue}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
