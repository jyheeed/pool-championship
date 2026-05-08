'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, type Language } from '@/lib/i18n';

const groupAffiliations = [
  { label: 'Royal Class', groups: ['Group C', 'Group O', 'Group A', 'Group L', 'Groupe C', 'Groupe O', 'Groupe A', 'Groupe L'] },
  { label: 'Grand 8', groups: ['Group J', 'Group T', 'Group S', 'Group F', 'Groupe J', 'Groupe T', 'Groupe S', 'Groupe F'] },
  { label: 'Emperor', groups: ['Group P', 'Group H', 'Group B', 'Group I', 'Groupe P', 'Groupe H', 'Groupe B', 'Groupe I'] },
  { label: 'Friend Zone', groups: ['Group N', 'Group K', 'Groupe N', 'Groupe K'] },
  { label: 'Break Hub', groups: ['Group R', 'Group G', 'Group Q', 'Group M', 'Group E', 'Group D', 'Groupe R', 'Groupe G', 'Groupe Q', 'Groupe M', 'Groupe E', 'Groupe D'] },
] as const;

const groupOrder: string[] = groupAffiliations.flatMap((entry) => entry.groups);

type Standing = {
  player: {
    id: string;
    name: string;
    poolGroup?: string;
    club?: string;
    nationality?: string;
    points: number;
    isSeeded?: boolean;
  };
};

type TournamentState = {
  groups: Record<string, Array<{ id: string; name: string; isSeeded: boolean }>>;
  phase2Groups: Record<string, Array<{ id: string; name: string; sourceGroup: string | null }>>;
  phase2Matches?: Array<{
    id: string;
    groupName?: string;
    player1Id: string;
    player2Id: string;
    score1?: number | null;
    score2?: number | null;
    status: string;
  }>;
};

function getGroupAffiliation(groupName: string) {
  const normalizedGroupName = groupName.trim().toLowerCase();
  return groupAffiliations.find((entry) => entry.groups.some((group) => group.toLowerCase() === normalizedGroupName));
}

function sortPhase1Groups(left: string, right: string) {
  const leftIndex = groupOrder.indexOf(left);
  const rightIndex = groupOrder.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
  if (leftIndex === -1) return 1;
  if (rightIndex === -1) return -1;
  return leftIndex - rightIndex;
}

export default function DrawPage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<'group' | 'group2'>('group');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [phase2Standings, setPhase2Standings] = useState<Record<string, Record<string, { id: string; name: string; points: number; wins: number; losses: number }>>>({});

  const t = getTranslations(language);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLanguage = localStorage.getItem(LANGUAGE_COOKIE) ?? DEFAULT_LANGUAGE;
      setLanguage(normalizeLanguage(storedLanguage));
    }

    const loadData = async () => {
      try {
        const [standingsRes, stateRes] = await Promise.all([
          fetch('/api/public/standings'),
          fetch('/api/public/tournament/state'),
        ]);

        const standingsData = await standingsRes.json();
        const stateData = await stateRes.json();

        if (standingsData.success) {
          setStandings(standingsData.data || []);
        }

        if (stateData.success) {
          const state: TournamentState = {
            groups: stateData.data?.groups || {},
            phase2Groups: stateData.data?.phase2Groups || {},
            phase2Matches: stateData.data?.phase2Matches || [],
          };
          setTournamentState(state);

          // Calculate Phase 2 standings from matches
          const phase2Matches = state.phase2Matches || [];
          const phase2Groups = state.phase2Groups || {};
          const standings: Record<string, Record<string, { id: string; name: string; points: number; wins: number; losses: number }>> = {};

          for (const [groupName, players] of Object.entries(phase2Groups)) {
            const groupStandings: Record<string, { id: string; name: string; points: number; wins: number; losses: number }> = {};
            
            // Initialize standings
            for (const player of players) {
              groupStandings[player.id] = {
                id: player.id,
                name: player.name,
                points: 0,
                wins: 0,
                losses: 0,
              };
            }

            // Calculate from matches
            const groupMatches = phase2Matches.filter(
              (m) => m.groupName?.trim() === groupName && m.status === 'completed'
            );

            for (const match of groupMatches) {
              const p1 = groupStandings[match.player1Id];
              const p2 = groupStandings[match.player2Id];
              if (!p1 || !p2) continue;

              const score1 = match.score1 ?? 0;
              const score2 = match.score2 ?? 0;

              if (score1 > score2) {
                p1.points += 3;
                p1.wins += 1;
                p2.losses += 1;
              } else if (score2 > score1) {
                p2.points += 3;
                p2.wins += 1;
                p1.losses += 1;
              }
            }

            standings[groupName] = groupStandings;
          }

          setPhase2Standings(standings);
        }
      } catch (error) {
        console.error('Failed to load tournament data:', error);
      }
    };

    loadData();
  }, []);

  const phase1Groups = useMemo(() => {
    const groups: Record<string, Standing[]> = {};
    for (const standing of standings || []) {
      const key = standing.player.poolGroup || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(standing);
    }
    return groups;
  }, [standings]);

  const phase2Groups = useMemo(() => tournamentState?.phase2Groups || {}, [tournamentState?.phase2Groups]);

  const phase1GroupKeys = useMemo(() => Object.keys(phase1Groups).sort(sortPhase1Groups), [phase1Groups]);
  const phase2GroupKeys = useMemo(() => Object.keys(phase2Groups).sort((left, right) => left.localeCompare(right)), [phase2Groups]);

  const activeGroupKeys = selectedPhase === 'group' ? phase1GroupKeys : phase2GroupKeys;
  const activeGroups = selectedPhase === 'group' ? phase1Groups : phase2Groups;

  useEffect(() => {
    if (selectedPhase === 'group' && phase1GroupKeys.length > 0 && !phase1GroupKeys.includes(selectedGroup || '')) {
      setSelectedGroup(phase1GroupKeys[0]);
    }
    if (selectedPhase === 'group2' && phase2GroupKeys.length > 0 && !phase2GroupKeys.includes(selectedGroup || '')) {
      setSelectedGroup(phase2GroupKeys[0]);
    }
    if (selectedPhase === 'group' && phase1GroupKeys.length === 0) {
      setSelectedGroup(null);
    }
    if (selectedPhase === 'group2' && phase2GroupKeys.length === 0) {
      setSelectedGroup(null);
    }
  }, [selectedGroup, selectedPhase, phase1GroupKeys, phase2GroupKeys]);

  useEffect(() => {
    if (selectedPhase === 'group' && phase1GroupKeys.length > 0) {
      setSelectedGroup((current) => (current && phase1GroupKeys.includes(current) ? current : phase1GroupKeys[0]));
      return;
    }

    if (selectedPhase === 'group2' && phase2GroupKeys.length > 0) {
      setSelectedGroup((current) => (current && phase2GroupKeys.includes(current) ? current : phase2GroupKeys[0]));
      return;
    }

    setSelectedGroup(null);
  }, [selectedPhase, phase1GroupKeys, phase2GroupKeys]);

  if (!standings) {
    return <div className="panel p-12 text-center text-white/60">Loading groups...</div>;
  }

  const totalPlayers = standings.length;
  const groupSizes = phase1GroupKeys.map((group) => phase1Groups[group].length);
  const minSize = groupSizes.length ? Math.min(...groupSizes) : 0;
  const maxSize = groupSizes.length ? Math.max(...groupSizes) : 0;
  const isBalanced = minSize === maxSize;

  const selectedGroupPlayers = selectedGroup ? activeGroups[selectedGroup] || [] : [];

  return (
    <div className="space-y-8 animate-in">
      <section className="pool-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.95fr] lg:items-end">
          <div>
            <p className="section-kicker text-[var(--accent-gold)]">{t.draw.seasonKicker('2026')}</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-6xl">{t.draw.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">{t.draw.subtitle}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 md:text-base">{t.draw.officialParagraph}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-card bg-white/6">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{t.draw.pools}</p>
              <p className="mt-2 text-4xl font-display text-[var(--accent-gold)]">{phase1GroupKeys.length}</p>
              <p className="mt-1 text-sm text-white/60">{t.draw.poolsCreated}</p>
            </div>
            <div className="stat-card bg-white/6">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{t.draw.players}</p>
              <p className="mt-2 text-4xl font-display text-[var(--accent-green)]">{totalPlayers}</p>
              <p className="mt-1 text-sm text-white/60">{t.draw.registeredPlayers}</p>
            </div>
            <div className="stat-card bg-white/6">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{t.draw.balance}</p>
              <p className="mt-2 text-4xl font-display text-[var(--accent-amber)]">{minSize}-{maxSize}</p>
              <p className="mt-1 text-sm text-white/60">{t.draw.groupSizeRange}</p>
            </div>
            <div className="stat-card bg-white/6">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{t.draw.status}</p>
              <p className="mt-2 text-3xl font-display text-white">{isBalanced ? t.draw.even : t.draw.mixed}</p>
              <p className="mt-1 text-sm text-white/60">{t.draw.automaticBalance}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5 md:p-6">
          <p className="section-kicker text-[var(--accent-red)]">{t.draw.seededFirst}</p>
          <p className="mt-2 text-sm text-white/66">{t.draw.seededFirstText}</p>
        </div>
        <div className="panel p-5 md:p-6">
          <p className="section-kicker text-[var(--accent-red)]">{t.draw.balancedAllocation}</p>
          <p className="mt-2 text-sm text-white/66">{t.draw.balancedAllocationText}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['group', 'group2'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedPhase === phase
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {phase === 'group' ? 'Phase 1' : 'Phase 2'}
            </button>
          ))}
        </div>
      </section>

      {activeGroupKeys.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">
          {selectedPhase === 'group' ? t.draw.noGroupsAssigned : 'Aucun tirage Phase 2 généré pour le moment.'}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{selectedPhase === 'group' ? 'Phase 1' : 'Phase 2'}</h2>
              <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/60">{activeGroupKeys.length} groupes</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeGroupKeys.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    selectedGroup === group
                      ? 'bg-[var(--accent-gold)] text-black'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {selectedPhase === 'group2' ? (
                    group.replace(/^Phase 2 - /, '') === 'Group F' ? 'Friend Zone : Group F' :
                    group.replace(/^Phase 2 - /, '') === 'Group N' ? "Break'hub : Group N" :
                    group.replace(/^Phase 2 - /, '') === 'Group E' ? "Break'hub : Group E" :
                    group.replace(/^Phase 2 - /, '') === 'Group G' ? "Break'hub : Group G" :
                    group.replace(/^Phase 2 - /, '') === 'Group C' ? 'Grand 8 : Group C' :
                    group.replace(/^Phase 2 - /, '') === 'Group A' ? 'Grand 8 : Group A' :
                    group.replace(/^Phase 2 - /, '') === 'Group D' ? 'Emperor : Group D' :
                    group.replace(/^Phase 2 - /, '') === 'Group B' ? 'Emperor : Group B' :
                    group.replace(/^Phase 2 - /, '')
                  ) : (
                    group
                  )}
                </button>
              ))}
            </div>
          </section>

          {selectedGroup && (
            <section className="panel overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(12,26,24,0.96),rgba(7,18,17,0.96))]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 md:px-6">
                <div>
                  <p className="section-kicker text-[var(--accent-gold)]">{selectedPhase === 'group' ? t.draw.pool : 'Phase 2 Group'}</p>
                  <h2 className="mt-1 text-2xl font-display md:text-3xl">
                    {selectedPhase === 'group' ? (
                      getGroupAffiliation(selectedGroup)?.label ? `${getGroupAffiliation(selectedGroup)?.label} : ${selectedGroup}` : selectedGroup
                    ) : (
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group F' ? 'Friend Zone : Group F' :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group N' ? "Break'hub : Group N" :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group E' ? "Break'hub : Group E" :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group G' ? "Break'hub : Group G" :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group C' ? 'Grand 8 : Group C' :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group A' ? 'Grand 8 : Group A' :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group D' ? 'Emperor : Group D' :
                      selectedGroup?.replace(/^Phase 2 - /, '') === 'Group B' ? 'Emperor : Group B' :
                      selectedGroup?.replace(/^Phase 2 - /, '')
                    )}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-white/60">
                  {selectedPhase === 'group' ? t.draw.playersInGroup(selectedGroupPlayers.length) : `${selectedGroupPlayers.length}/5 players`}
                </div>
              </div>

              <div className="divide-y divide-white/6">
                {selectedPhase === 'group'
                  ? (selectedGroupPlayers as Standing[])
                      .slice()
                      .sort((a, b) => b.player.points - a.player.points || a.player.name.localeCompare(b.player.name))
                      .map((standing) => (
                        <div key={standing.player.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/players/${standing.player.id}`} className="truncate text-base font-semibold transition hover:text-[var(--accent-gold)] md:text-lg">{standing.player.name}</Link>
                              {standing.player.isSeeded && <span className="rounded-full border border-[rgba(255,194,71,0.25)] bg-[rgba(255,194,71,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-gold)]">{t.draw.seed}</span>}
                            </div>
                            <p className="mt-1 truncate text-xs text-white/55 md:text-sm">{standing.player.club || standing.player.nationality}</p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-xl font-bold text-[var(--accent-gold)] md:text-2xl">{standing.player.points}</p>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{t.draw.points}</p>
                          </div>
                        </div>
                      ))
                  : selectedGroup && phase2Standings[selectedGroup]
                  ? Object.values(phase2Standings[selectedGroup])
                      .slice()
                      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
                      .map((player) => (
                        <div key={player.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-base font-semibold text-white md:text-lg">{player.name}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-white/55 md:text-sm">{player.wins}W - {player.losses}L</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xl font-bold text-[var(--accent-gold)] md:text-2xl">{player.points}</p>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{t.draw.points}</p>
                          </div>
                        </div>
                      ))
                  : (selectedGroupPlayers as Array<{ id: string; name: string; sourceGroup: string | null }>)
                      .map((player) => (
                        <div key={player.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-base font-semibold text-white md:text-lg">{player.name}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-white/55 md:text-sm">{player.sourceGroup || 'Unassigned'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xl font-bold text-[var(--accent-gold)] md:text-2xl">{selectedGroupPlayers.length || 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">players</p>
                          </div>
                        </div>
                      ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
