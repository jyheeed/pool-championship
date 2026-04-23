import Link from 'next/link';
import { getScheduleView } from '@/lib/tournament/tournament-service';

export const revalidate = 30;

export default async function TournamentSchedulePage() {
  const schedule = await getScheduleView();

  const groupsMap = new Map<string, typeof schedule>();
  for (const match of schedule) {
    const groupName = match.groupName || 'Unassigned';
    const list = groupsMap.get(groupName) || [];
    list.push(match);
    groupsMap.set(groupName, list);
  }

  const groupEntries = Array.from(groupsMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6 animate-in">
      <section className="panel p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-white/50">Competition Schedule</p>
        <h1 className="mt-2 text-3xl font-semibold">Group Stage Schedule</h1>
        <p className="mt-2 text-sm text-white/65">
          Browse schedule by group. Click a group card to consult all matches for that group.
        </p>
      </section>

      {groupEntries.length === 0 ? (
        <section className="panel p-8 text-center text-sm text-white/60">No group matches scheduled yet.</section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupEntries.map(([groupName, matches]) => {
            const scheduledCount = matches.filter((match) => Boolean(match.scheduledAt)).length;
            const completedCount = matches.filter((match) => match.status === 'completed').length;
            const nextMatch = matches
              .filter((match) => match.scheduledAt)
              .sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime())[0];

            return (
              <Link
                key={groupName}
                href={`/groups/${encodeURIComponent(groupName)}`}
                className="panel block p-5 transition hover:border-white/30 hover:bg-white/5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Group</p>
                <h2 className="mt-2 text-2xl font-semibold">{groupName}</h2>
                <div className="mt-4 space-y-1 text-sm text-white/70">
                  <p>Total matches: {matches.length}</p>
                  <p>Scheduled: {scheduledCount}</p>
                  <p>Completed: {completedCount}</p>
                  <p>Next: {nextMatch?.scheduledAt ? new Date(nextMatch.scheduledAt).toLocaleString() : 'Not scheduled'}</p>
                </div>
                <p className="mt-4 text-xs text-[var(--accent-blue)]">Open all matches</p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
