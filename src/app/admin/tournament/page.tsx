'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type PlayerRow = {
  id: string;
  name: string;
  poolGroup?: string;
  isSeeded?: boolean;
};

type TournamentState = {
  players: PlayerRow[];
  groups: Record<string, Array<{ id: string; name: string; isSeeded: boolean }>>;
  matches: Array<{
    id: string;
    groupName: string;
    round: string;
    roundNumber?: number;
    player1Id: string;
    player2Id: string;
    status: string;
    scheduledAt: string | null;
    venue: string | null;
    tableNumber: number | null;
    date: string;
    time: string;
  }>;
};

function defaultGroupNames(groupCount: number): string[] {
  return Array.from({ length: groupCount }, (_, index) => {
    if (index < 26) {
      return `Group ${String.fromCharCode(65 + index)}`;
    }
    return `Group ${index + 1}`;
  });
}

function toLocalDateTimeValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function TournamentAdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [state, setState] = useState<TournamentState | null>(null);
  const [venues, setVenues] = useState<string[]>([]);

  const [groupCount, setGroupCount] = useState(4);
  const [groupNamesText, setGroupNamesText] = useState(defaultGroupNames(4).join(', '));
  const [seededPlayerIds, setSeededPlayerIds] = useState<Set<string>>(new Set());

  const [scheduleStart, setScheduleStart] = useState('');
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(45);
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(10);
  const [tableCount, setTableCount] = useState(4);

  const [manualDateTimes, setManualDateTimes] = useState<Record<string, string>>({});
  const [manualVenues, setManualVenues] = useState<Record<string, string>>({});

  const groupNames = useMemo(
    () => groupNamesText.split(',').map((name) => name.trim()).filter(Boolean),
    [groupNamesText]
  );

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach((player) => map.set(player.id, player.name));
    return map;
  }, [players]);

  const applyGroupCount = useCallback((nextGroupCount: number) => {
    const normalizedGroupCount = Math.max(2, Math.min(32, nextGroupCount));
    setGroupCount(normalizedGroupCount);
    setGroupNamesText(defaultGroupNames(normalizedGroupCount).join(', '));
  }, []);

  const load = useCallback(async () => {
    const [playersRes, stateRes, settingsRes] = await Promise.all([
      fetch('/api/public/players'),
      fetch('/api/admin/tournament/state'),
      fetch('/api/public/settings'),
    ]);

    const playersData = await playersRes.json();
    const stateData = await stateRes.json();
    const settingsData = await settingsRes.json();

    if (playersData.success) {
      setPlayers(playersData.data || []);
    }

    if (settingsData.success) {
      setVenues(Array.isArray(settingsData.data?.venues) ? settingsData.data.venues : []);
    }

    if (stateData.success) {
      const nextState = stateData.data as TournamentState;
      setState(nextState);

      const currentSeeds = new Set<string>();
      (nextState.players || []).forEach((player) => {
        if (player.isSeeded) currentSeeds.add(player.id);
      });
      if (currentSeeds.size >= 2) {
        setSeededPlayerIds(currentSeeds);
        applyGroupCount(currentSeeds.size);
      } else if (currentSeeds.size > 0) {
        setSeededPlayerIds(currentSeeds);
      }

      const dateTimes: Record<string, string> = {};
      const nextVenues: Record<string, string> = {};
      for (const match of nextState.matches || []) {
        dateTimes[match.id] = toLocalDateTimeValue(match.scheduledAt);
        nextVenues[match.id] = match.venue || '';
      }
      setManualDateTimes(dateTimes);
      setManualVenues(nextVenues);
    }
  }, [applyGroupCount]);

  useEffect(() => {
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login');
          return;
        }
        setAuthed(true);
        return load();
      })
      .catch(() => {
        setMessage('Failed to verify admin session');
      });
  }, [router, load]);

  function flash(nextMessage: string) {
    setMessage(nextMessage);
    setTimeout(() => setMessage(''), 3000);
  }

  function toggleSeed(playerId: string) {
    setSeededPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);

      if (next.size >= 2) {
        applyGroupCount(next.size);
      }
      return next;
    });
  }

  function regenerateGroupNames(nextGroupCount: number) {
    applyGroupCount(nextGroupCount);
  }

  async function runDraw() {
    if (groupNames.length !== groupCount) {
      flash('Number of group names must match group count');
      return;
    }
    if (seededPlayerIds.size !== groupCount) {
      flash('Select exactly one seed per group');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/tournament/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'groups',
          groupCount,
          groupNames,
          seededPlayerIds: Array.from(seededPlayerIds),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        flash(data.error || 'Failed to generate group draw');
        return;
      }

      flash('Group draw generated successfully');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function runMatchGeneration() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tournament/group-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting: true }),
      });
      const data = await res.json();
      if (!data.success) {
        flash(data.error || 'Failed to generate group matches');
        return;
      }
      flash(`Generated ${data.data?.count || 0} group matches`);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function runScheduling() {
    if (!scheduleStart) {
      flash('Schedule start datetime is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/tournament/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDateTime: new Date(scheduleStart).toISOString(),
          matchDurationMinutes,
          breakDurationMinutes,
          tableCount,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        flash(data.error || 'Failed to generate schedule');
        return;
      }
      flash(`Scheduled ${data.data?.count || 0} matches`);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function saveManualSchedule(matchId: string) {
    const nextDateTime = manualDateTimes[matchId];
    const nextVenue = (manualVenues[matchId] || '').trim();

    if (!nextDateTime) {
      flash('Datetime is required for manual update');
      return;
    }

    if (!nextVenue) {
      flash('Venue is required for manual update');
      return;
    }

    if (venues.length > 0 && !venues.includes(nextVenue)) {
      flash('Selected venue must be one of registered venues');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournament/matches/${encodeURIComponent(matchId)}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(nextDateTime).toISOString(),
          venue: nextVenue,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        flash(data.error || 'Failed to update match schedule');
        return;
      }

      flash('Match schedule updated');
      await load();
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return <div className="panel p-6 text-white/70">Checking admin session...</div>;
  }

  const groupEntries = Object.entries(state?.groups || {}).sort(([a], [b]) => a.localeCompare(b));
  const groupMatches = [...(state?.matches || [])].sort((a, b) => {
    const byGroup = a.groupName.localeCompare(b.groupName);
    if (byGroup !== 0) return byGroup;
    const byRound = (a.roundNumber || 0) - (b.roundNumber || 0);
    if (byRound !== 0) return byRound;
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold text-white">Tournament Local Testing</h1>
        <p className="mt-2 text-sm text-white/65">
          End-to-end flow for group draw, round-robin generation, scheduling, and manual schedule edits.
        </p>
        {message && <p className="mt-3 text-sm text-[var(--accent-gold)]">{message}</p>}
      </section>

      <section className="panel p-6 space-y-4">
        <h2 className="text-xl font-semibold">1. Tournament Format and Groups</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Format</span>
            <input value="groups" disabled className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Group count</span>
            <input
              type="number"
              min={2}
              max={32}
              value={groupCount}
              onChange={(e) => applyGroupCount(Number(e.target.value || 2))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => regenerateGroupNames(groupCount)}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            >
              Regenerate Group Names
            </button>
          </div>
        </div>
        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">Group names (comma-separated)</span>
          <input
            value={groupNamesText}
            onChange={(e) => setGroupNamesText(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-white/45">
          Group count follows the number of selected seeds. Select 4 seeds for 4 groups, 10 seeds for 10 groups, then run the draw.
        </p>
      </section>

      <section className="panel p-6 space-y-4">
        <h2 className="text-xl font-semibold">2. Seeded Players Selection</h2>
        <p className="text-sm text-white/65">
          Selected seeds: {seededPlayerIds.size}/{groupCount} (exactly one seed per group required)
        </p>
        <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-white/10 p-3">
          {players.map((player) => (
            <label key={player.id} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <input
                type="checkbox"
                checked={seededPlayerIds.has(player.id)}
                onChange={() => toggleSeed(player.id)}
              />
              <span className="text-sm">{player.name}</span>
              <span className="text-xs text-white/50">{player.id}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={runDraw}
          className="rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Generate Draw
        </button>
      </section>

      <section className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">3. Groups Overview</h2>
          <Link href="/draw" className="text-sm text-[var(--accent-blue)] underline">Open Public Draw View</Link>
        </div>

        {groupEntries.length === 0 ? (
          <p className="text-sm text-white/60">No groups available yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groupEntries.map(([groupName, groupPlayers]) => (
              <div key={groupName} className="rounded-xl border border-white/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{groupName}</h3>
                  <Link href={`/groups/${encodeURIComponent(groupName)}`} className="text-xs text-[var(--accent-blue)] underline">
                    Group detail
                  </Link>
                </div>
                <ul className="space-y-1 text-sm">
                  {groupPlayers.map((player) => (
                    <li key={player.id} className="flex items-center justify-between">
                      <span>{player.name}</span>
                      {player.isSeeded && <span className="text-xs text-[var(--accent-gold)]">Seed</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">4. Generate Group Matches (Round-Robin)</h2>
          <button
            type="button"
            disabled={loading}
            onClick={runMatchGeneration}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            Generate Group Matches
          </button>
        </div>

        <p className="text-sm text-white/65">
          Total generated group matches: {groupMatches.length}
        </p>
      </section>

      <section className="panel p-6 space-y-4">
        <h2 className="text-xl font-semibold">5. Generate Schedule</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Start datetime</span>
            <input
              type="datetime-local"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Match duration (min)</span>
            <input
              type="number"
              min={5}
              value={matchDurationMinutes}
              onChange={(e) => setMatchDurationMinutes(Number(e.target.value || 5))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Break (min)</span>
            <input
              type="number"
              min={0}
              value={breakDurationMinutes}
              onChange={(e) => setBreakDurationMinutes(Number(e.target.value || 0))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Tables</span>
            <input
              type="number"
              min={1}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={runScheduling}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Generate Schedule Proposal
        </button>
      </section>

      <section className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">6. Group Matches and Manual Edits</h2>
          <Link href="/schedule" className="text-sm text-[var(--accent-blue)] underline">Open Public Schedule View</Link>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/60">
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2">Round</th>
                <th className="px-2 py-2">Players</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Datetime</th>
                <th className="px-2 py-2">Venue</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {groupMatches.map((match) => (
                <tr key={match.id} className="border-b border-white/5">
                  <td className="px-2 py-2">{match.groupName}</td>
                  <td className="px-2 py-2">{match.roundNumber || '-'}</td>
                  <td className="px-2 py-2">
                    {playerNameById.get(match.player1Id) || match.player1Id} vs {playerNameById.get(match.player2Id) || match.player2Id}
                  </td>
                  <td className="px-2 py-2">{match.status}</td>
                  <td className="px-2 py-2">
                    <input
                      type="datetime-local"
                      value={manualDateTimes[match.id] || ''}
                      onChange={(e) => setManualDateTimes((prev) => ({ ...prev, [match.id]: e.target.value }))}
                      className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {venues.length > 0 ? (
                      <select
                        value={manualVenues[match.id] || ''}
                        onChange={(e) => setManualVenues((prev) => ({ ...prev, [match.id]: e.target.value }))}
                        className="min-w-[180px] rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs"
                      >
                        <option value="">Select venue</option>
                        {venues.map((venue) => (
                          <option key={venue} value={venue}>{venue}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={manualVenues[match.id] || ''}
                        onChange={(e) => setManualVenues((prev) => ({ ...prev, [match.id]: e.target.value }))}
                        placeholder="Venue"
                        className="min-w-[180px] rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveManualSchedule(match.id)}
                      className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
