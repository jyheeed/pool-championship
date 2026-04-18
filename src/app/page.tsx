import Link from 'next/link';
import { CalendarDays, ChevronRight, Trophy, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import { getMatches, getSettings, getStandings } from '@/lib/mongo-service';
import type { Match, Standing, TournamentSettings } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, translateStatus } from '@/lib/i18n';

export const revalidate = 60;

function getCompletionRate(total: number, completed: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export default async function HomePage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  let standings: Standing[] = [];
  let settings: TournamentSettings = {
    name: process.env.NEXT_PUBLIC_TOURNAMENT_NAME || 'Pool Championship',
    season: '2026',
    pointsWin: 3,
    pointsLoss: 0,
  };
  let allMatches: Match[] = [];
  let dataUnavailable = false;

  try {
    [standings, settings, allMatches] = await Promise.all([
      getStandings(),
      getSettings(),
      getMatches(),
    ]);
  } catch {
    dataUnavailable = true;
  }

  if (dataUnavailable || !standings.length) {
    return (
      <div className="space-y-8 animate-in">
        <section className="pool-hero text-center">
          <p className="section-kicker">{t.home.dataUnavailableTitle}</p>
          <h1 className="page-title mt-4">{settings.heroTitle || (settings.name === 'Pool Championship' ? t.home.heroTitle : settings.name)}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/72">
            {t.home.dataUnavailableBody}
          </p>
          <div className="mt-6 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-2 font-mono text-xs text-white/70">
            {t.home.dataUnavailableAction}
          </div>
        </section>
      </div>
    );
  }

  const topPlayer = standings[0]?.player;
  const completedMatches = allMatches.filter((match) => match.status === 'completed');
  const upcomingMatches = allMatches
    .filter((match) => match.status === 'scheduled' || match.status === 'live' || match.status === 'postponed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
  const recentMatches = [...completedMatches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  const totalPlayers = standings.length;
  const totalMatches = allMatches.length;
  const completionRate = getCompletionRate(totalMatches, completedMatches.length);

  return (
    <div className="space-y-8 animate-in lg:space-y-10">
      <section className="pool-hero pool-hero-home">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5">
            <p className="section-kicker">
              {t.home.seasonKicker(settings.season, language === 'ar' ? 'تونس' : language === 'fr' ? 'Tunisie' : 'Tunisia')}
            </p>
            <div>
              <h1 className="page-title">{settings.heroTitle || (settings.name === 'Pool Championship' ? t.home.heroTitle : settings.name)}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 md:text-lg">
                {settings.heroSubtitle || t.home.heroSubtitle}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="stat-card stat-card-tilt">
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{t.home.leader}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{topPlayer?.name}</p>
                <p className="mt-1 text-sm text-white/60">{topPlayer?.points ?? 0} {t.home.tableHeadings.points} · {topPlayer?.wins ?? 0} {language === 'fr' ? 'victoires' : language === 'ar' ? 'انتصارات' : 'wins'}</p>
              </div>
              <div className="stat-card stat-card-tilt">
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{t.home.competition}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{t.home.playersCount(totalPlayers)}</p>
                <p className="mt-1 text-sm text-white/60">
                  W {settings.pointsWin} · L {settings.pointsLoss}
                </p>
              </div>
              <div className="stat-card stat-card-tilt">
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{t.home.progress}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{completionRate}%</p>
                <p className="mt-1 text-sm text-white/60">{t.home.matchesCompleted(completedMatches.length, totalMatches)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/register" className="hero-cta hero-cta-primary">
                {t.nav.registration}
                <ChevronRight size={16} />
              </Link>
              <Link href="/fixtures" className="hero-cta hero-cta-secondary">
                {t.home.fullSchedule}
              </Link>
            </div>

          </div>

          <div className="panel-soft snapshot-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker text-[var(--accent-blue)]">{t.home.tournamentPulse}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t.home.quickSnapshot}</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { label: t.home.playersRegistered, value: totalPlayers.toString(), icon: Users },
                { label: t.home.matchesCompletedLabel, value: completedMatches.length.toString(), icon: Trophy },
                { label: t.home.nextFixturesLoaded, value: upcomingMatches.length.toString(), icon: CalendarDays },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-white/10 bg-black/20 p-2">
                      <Icon size={16} className="text-white/80" />
                    </div>
                    <span className="text-sm text-white/72">{label}</span>
                  </div>
                  <span className="font-mono text-xl font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="arena-strip stagger" aria-label="Tournament quick metrics">
        <article className="arena-strip-card">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{t.home.playersRegistered}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white">{totalPlayers}</p>
        </article>
        <article className="arena-strip-card">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{t.home.nextFixturesLoaded}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white">{upcomingMatches.length}</p>
        </article>
        <article className="arena-strip-card">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{t.home.matchesCompletedLabel}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-white">{completedMatches.length}</p>
        </article>
      </section>

      <div className="arena-layout grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="panel leaderboard-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div>
              <p className="section-kicker">{t.home.leaderboard}</p>
              <h2 className="mt-1 text-3xl font-semibold">{t.home.standings}</h2>
            </div>
            <Link href="/players" className="inline-flex items-center gap-1 text-sm text-white/70 transition hover:text-white">
              {t.home.viewAllPlayers}
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full standings-table">
              <thead>
                <tr>
                  <th>{t.home.tableHeadings.rank}</th>
                  <th>{t.home.tableHeadings.player}</th>
                  <th className="text-center">{t.home.tableHeadings.played}</th>
                  <th className="text-center">{t.home.tableHeadings.wins}</th>
                  <th className="text-center">{t.home.tableHeadings.losses}</th>
                  <th className="text-center">{t.home.tableHeadings.frameDiff}</th>
                  <th className="text-center">{t.home.tableHeadings.points}</th>
                  <th>{t.home.tableHeadings.form}</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {standings.map(({ rank, player, form }) => (
                  <tr key={player.id}>
                    <td className="font-mono text-sm text-white/45">{rank}</td>
                    <td>
                      <Link href={`/players/${player.id}`} className="font-medium transition hover:text-[var(--accent-gold)]">
                        {player.name}
                        {player.nickname && <span className="ml-1.5 text-xs text-white/45">“{player.nickname}”</span>}
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
                        {form.map((entry, index) => (
                          <span key={`${player.id}-${index}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold form-badge-${entry.toLowerCase()}`}>
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
        </section>

        <div className="space-y-6">
          <section className="panel mini-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker text-[var(--accent-blue)]">{t.home.upcoming}</p>
                <h2 className="mt-1 text-2xl font-semibold">{t.home.scheduleFocus}</h2>
              </div>
              <Link href="/fixtures" className="text-sm text-white/65 transition hover:text-white">
                {t.home.fullSchedule}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingMatches.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-white/60">
                  {t.home.noUpcomingFixtures}
                </div>
              )}

              {upcomingMatches.map((match) => (
                <div key={match.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{match.round}</p>
                      <p className="mt-2 font-semibold">{match.player1Name} <span className="text-white/35">vs</span> {match.player2Name}</p>
                    </div>
                    <span className={`status-pill ${match.status === 'postponed' ? 'status-postponed' : match.status === 'live' ? 'status-live' : 'status-scheduled'}`}>
                        {translateStatus(language, match.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white/62">
                    {match.date}{match.time ? ` · ${match.time}` : ''}{match.venue ? ` · ${match.venue}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel mini-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker text-[var(--accent-green)]">{t.home.completed}</p>
                <h2 className="mt-1 text-2xl font-semibold">{t.home.latestResults}</h2>
              </div>
              <Link href="/results" className="text-sm text-white/65 transition hover:text-white">
                {t.home.resultsCentre}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentMatches.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-white/60">
                  {t.home.noCompletedMatches}
                </div>
              )}

              {recentMatches.map((match) => (
                <div key={match.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {match.round} · {match.date}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`font-medium ${(match.score1 ?? 0) > (match.score2 ?? 0) ? 'text-[var(--accent-green)]' : ''}`}>
                      {match.player1Name}
                    </span>
                    <span className="font-mono text-xl font-bold text-[var(--accent-gold)]">
                      {match.score1} - {match.score2}
                    </span>
                    <span className={`text-right font-medium ${(match.score2 ?? 0) > (match.score1 ?? 0) ? 'text-[var(--accent-green)]' : ''}`}>
                      {match.player2Name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
