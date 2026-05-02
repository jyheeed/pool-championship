'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Standing } from '@/lib/types';

interface GroupStandingsProps {
  standings: Standing[];
  language: string;
  tableHeadings: {
    rank: string;
    player: string;
    played: string;
    wins: string;
    losses: string;
    frameDiff: string;
    points: string;
    form: string;
  };
}

export default function GroupStandings({ standings, language, tableHeadings }: GroupStandingsProps) {
  // Get unique groups and sort them
  const groupMap = new Map<string, Standing[]>();
  
  standings.forEach((standing) => {
    const group = standing.player.poolGroup || 'Unassigned';
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(standing);
  });

  const groups = Array.from(groupMap.keys()).sort();
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0] || '');

  const selectedGroupStandings = groupMap.get(selectedGroup) || [];

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="panel leaderboard-panel">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="section-kicker">{language === 'fr' ? 'Classement par groupe' : language === 'ar' ? 'التصنيف حسب المجموعة' : 'Group Standings'}</p>
          <h2 className="mt-1 text-3xl font-semibold">{selectedGroup}</h2>
        </div>
      </div>

      {/* Group Selection Buttons */}
      <div className="flex flex-wrap gap-2 border-b border-white/8 px-5 py-4">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedGroup === group
                ? 'bg-[var(--accent-gold)] text-black'
                : 'border border-white/8 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full standings-table">
            <thead className="sticky top-0 z-10 bg-black/60 backdrop-blur">
              <tr>
                <th>{tableHeadings.rank}</th>
                <th>{tableHeadings.player}</th>
                <th className="text-center">{tableHeadings.played}</th>
                <th className="text-center">{tableHeadings.wins}</th>
                <th className="text-center">{tableHeadings.losses}</th>
                <th className="text-center">{tableHeadings.frameDiff}</th>
                <th className="text-center">{tableHeadings.points}</th>
                <th>{tableHeadings.form}</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {selectedGroupStandings.map(({ player, form }, index) => (
                <tr key={player.id}>
                  <td className="font-mono text-sm text-white/45">{index + 1}</td>
                  <td>
                    <Link href={`/players/${player.id}`} className="font-medium transition hover:text-[var(--accent-gold)]">
                      {player.name}
                      {player.nickname && <span className="ml-1.5 text-xs text-white/45">"{player.nickname}"</span>}
                    </Link>
                  </td>
                  <td className="text-center font-mono text-sm">{player.played}</td>
                  <td className="text-center font-mono text-sm text-[var(--accent-green)]">{player.wins}</td>
                  <td className="text-center font-mono text-sm text-[#ff8f98]">{player.losses}</td>
                  <td className="text-center font-mono text-sm">
                    <span className={player.frameDiff >= 0 ? 'text-[var(--accent-green)]' : 'text-[#ff8f98]'}>
                      {player.frameDiff > 0 ? '+' : ''}{player.frameDiff}
                    </span>
                  </td>
                  <td className="text-center font-mono text-lg font-bold text-[var(--accent-gold)]">{player.points}</td>
                  <td>
                    <div className="flex gap-1">
                      {form.map((entry, i) => (
                        <span key={`${player.id}-${i}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold form-badge-${entry.toLowerCase()}`}>
                          {entry}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
