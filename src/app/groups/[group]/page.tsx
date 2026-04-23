import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGroupDetail } from '@/lib/tournament/tournament-service';

export const revalidate = 30;

export default async function GroupDetailPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const groupName = decodeURIComponent(group);

  const detail = await getGroupDetail(groupName);
  if (!detail) return notFound();

  const upcoming = detail.matches.filter((match) => match.status !== 'completed');
  const completed = detail.matches.filter((match) => match.status === 'completed');

  return (
    <div className="space-y-6 animate-in">
      <div className="panel p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-white/50">Group Detail</p>
        <h1 className="mt-2 text-3xl font-semibold">{detail.groupName}</h1>
        <p className="mt-2 text-sm text-white/65">Upcoming and completed matches for this group.</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {detail.players.map((player) => (
            <Link key={player.id} href={`/players/${player.id}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 hover:bg-white/10">
              {player.name}
            </Link>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="panel p-5 text-sm text-white/60">No upcoming matches in this group.</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((match) => (
              <div key={match.id} className="panel p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Round {match.roundNumber || '-'}</p>
                    <p className="mt-1 text-lg font-semibold">{match.player1Name} vs {match.player2Name}</p>
                  </div>
                  <div className="text-sm text-white/70">
                    <p>{match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : 'Not scheduled yet'}</p>
                    <p>{match.venue || (match.tableNumber ? `Table ${match.tableNumber}` : 'Venue TBD')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Completed</h2>
        {completed.length === 0 ? (
          <div className="panel p-5 text-sm text-white/60">No completed matches in this group.</div>
        ) : (
          <div className="space-y-3">
            {completed.map((match) => (
              <div key={match.id} className="panel p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Round {match.roundNumber || '-'}</p>
                    <p className="mt-1 text-lg font-semibold">{match.player1Name} vs {match.player2Name}</p>
                  </div>
                  <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-2 font-mono text-xl">
                    {match.score1 ?? '-'} : {match.score2 ?? '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
