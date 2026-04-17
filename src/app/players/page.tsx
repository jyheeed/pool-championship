import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { getPlayers } from '@/lib/mongo-service';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage } from '@/lib/i18n';

export const revalidate = 60;

type PlayersSearchParams = {
  q?: string;
  club?: string;
  sort?: string;
};

export default async function PlayersPage({ searchParams }: { searchParams?: PlayersSearchParams }) {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  let players: Awaited<ReturnType<typeof getPlayers>> = [];

  try {
    players = await getPlayers();
  } catch {
    players = [];
  }

  const q = (searchParams?.q || '').trim().toLowerCase();
  const selectedClub = (searchParams?.club || '').trim();
  const sort = (searchParams?.sort || 'points').trim();

  const clubs = Array.from(new Set(players.map((player) => player.club?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

  const filteredPlayers = players.filter((player) => {
    if (selectedClub && player.club !== selectedClub) return false;
    if (!q) return true;

    const haystack = [player.name, player.nickname || '', player.nationality || '', player.club || '']
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sort === 'wins') return b.wins - a.wins;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return b.points - a.points;
  });

  const isFr = language === 'fr';
  const searchLabel = isFr ? 'Recherche' : 'Search';
  const searchPlaceholder = isFr ? 'Nom, surnom, club, nationalite' : 'Name, nickname, club, nationality';
  const clubLabel = isFr ? 'Club' : 'Club';
  const allClubsLabel = isFr ? 'Tous les clubs' : 'All clubs';
  const sortLabel = isFr ? 'Tri' : 'Sort';
  const sortPointsLabel = isFr ? 'Points' : 'Points';
  const sortWinsLabel = isFr ? 'Victoires' : 'Wins';
  const sortNameLabel = isFr ? 'Nom (A-Z)' : 'Name (A-Z)';
  const applyLabel = isFr ? 'Appliquer' : 'Apply';
  const resetLabel = isFr ? 'Reinitialiser' : 'Reset';

  return (
    <div className="space-y-8 animate-in">
      <section className="panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-blue)]">{t.players.kicker}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{t.players.title}</h1>
            <p className="page-subtitle mt-3">
              {t.players.subtitle}
            </p>
          </div>
          <div className="status-pill status-scheduled">{t.players.athletesCount(sortedPlayers.length)}</div>
        </div>

        <form className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2 md:gap-3 md:p-4 md:grid-cols-[1.5fr_1fr_1fr_auto_auto] md:items-end" method="GET">
          <label className="block text-xs uppercase tracking-[0.16em] text-white/50">
            {searchLabel}
            <input name="q" defaultValue={searchParams?.q || ''} placeholder={searchPlaceholder} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none" />
          </label>

          <label className="block text-xs uppercase tracking-[0.16em] text-white/50">
            {clubLabel}
            <select name="club" defaultValue={selectedClub} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none">
              <option value="">{allClubsLabel}</option>
              {clubs.map((club) => (
                <option key={club} value={club}>{club}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs uppercase tracking-[0.16em] text-white/50">
            {sortLabel}
            <select name="sort" defaultValue={sort} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none">
              <option value="points">{sortPointsLabel}</option>
              <option value="wins">{sortWinsLabel}</option>
              <option value="name">{sortNameLabel}</option>
            </select>
          </label>

          <button type="submit" className="rounded-lg bg-[var(--accent-red)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 sm:col-start-1 md:col-start-auto md:row-start-auto">{applyLabel}</button>
          <Link href="/players" className="rounded-lg border border-[var(--border)] px-4 py-2 text-center text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">{resetLabel}</Link>
        </form>
      </section>

      {sortedPlayers.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{t.players.noPlayers}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
          {sortedPlayers.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="panel group p-5 transition duration-200 hover:-translate-y-1 hover:border-[rgba(255,194,71,0.18)]"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.08)] font-display text-3xl text-[var(--accent-gold)]">
                  {player.photoUrl ? (
                    <Image src={player.photoUrl} alt={player.name} fill className="object-cover" unoptimized />
                  ) : (
                    player.name.charAt(0)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold group-hover:text-[var(--accent-gold)]">{player.name}</h3>
                      {player.nickname && <p className="text-sm text-white/45">&quot;{player.nickname}&quot;</p>}
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-right">
                      <p className="font-mono text-2xl font-bold text-[var(--accent-gold)]">{player.points}</p>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{t.players.points}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-white/58">
                    {player.nationality}{player.club ? ` - ${player.club}` : ''}{player.age ? ` - ${t.players.years(player.age)}` : ''}
                  </p>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: t.players.metrics.played, value: player.played, color: 'text-white' },
                      { label: t.players.metrics.wins, value: player.wins, color: 'text-[var(--accent-green)]' },
                      { label: t.players.metrics.losses, value: player.losses, color: 'text-[#ff8f98]' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/5 px-2 py-3 text-center">
                        <p className={`font-mono text-lg font-bold ${metric.color}`}>{metric.value}</p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
