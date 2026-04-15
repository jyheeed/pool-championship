import { CalendarDays } from 'lucide-react';
import { cookies } from 'next/headers';
import { getClubs, getMatches, getSettings } from '@/lib/mongo-service';
import type { Club, Match, TournamentSettings } from '@/lib/types';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, translateStatus } from '@/lib/i18n';

export const revalidate = 60;

type UpcomingEvent = {
  id: string;
  title: string;
  date: string;
  note: string;
  venue: string;
};

function hashValue(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickVenue(clubs: Club[], seed: string): string {
  if (clubs.length === 0) return 'Lieu a definir';
  const venueIndex = hashValue(seed) % clubs.length;
  return clubs[venueIndex].name;
}

export default async function FixturesPage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  let fixtures: Match[] = [];
  let settings: TournamentSettings;
  let clubs: Club[] = [];

  try {
    const [allMatches, clubData, tournamentSettings] = await Promise.all([
      getMatches(),
      getClubs(),
      getSettings(),
    ]);
    clubs = clubData;
    settings = tournamentSettings;
    fixtures = allMatches
      .filter((match) => match.status === 'scheduled' || match.status === 'postponed' || match.status === 'live')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    settings = { name: 'Pool Championship', season: '2026', pointsWin: 3, pointsLoss: 0 };
  }

  const upcomingEvents: UpcomingEvent[] = [
    {
      id: 'group-stage',
      title: t.fixtures.eventOneTitle,
      date: t.fixtures.eventOneDate,
      note: t.fixtures.eventOneNote,
      venue: pickVenue(clubs, 'phases-de-poule-1-mai'),
    },
    {
      id: 'coupe-tunisie',
      title: t.fixtures.eventTwoTitle,
      date: t.fixtures.eventTwoDate,
      note: t.fixtures.eventTwoNote,
      venue: pickVenue(clubs, 'coupe-tunisie'),
    },
  ];

  const rounds = fixtures.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.round || 'TBD';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in">
      <section className="panel p-6 md:p-8">
        <p className="section-kicker text-[var(--accent-blue)]">{t.fixtures.seasonKicker(settings.season)}</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">{t.fixtures.title}</h1>
            <p className="page-subtitle mt-3">
              {t.fixtures.subtitle}
            </p>
          </div>
          <div className="status-pill status-scheduled">{t.fixtures.fixturesCount(fixtures.length)}</div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-[var(--accent-gold)]" />
          <h2 className="text-2xl font-semibold">{t.fixtures.upcomingEvents}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {upcomingEvents.map((event) => (
            <article key={event.id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t.fixtures.event}</p>
                  <h3 className="mt-2 text-xl font-semibold">{event.title}</h3>
                </div>
                <span className="status-pill status-scheduled">{event.date}</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/65">{event.note}</p>

              <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{t.fixtures.venue}</p>
                <p className="mt-1 text-sm font-medium text-white/85">{event.venue}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {Object.keys(rounds).length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{t.fixtures.noUpcomingFixtures}</div>
      ) : (
        Object.entries(rounds).map(([round, matches]) => (
          <section key={round} className="space-y-3">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-[var(--accent-blue)]" />
              <h2 className="text-2xl font-semibold">{language === 'fr' || language === 'ar' ? `${t.fixtures.roundLabel} ${round}` : round}</h2>
            </div>

            <div className="space-y-3 stagger">
              {matches.map((match) => (
                <div key={match.id} className="panel p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t.fixtures.matchCard}</p>
                      <p className="mt-2 text-xl font-semibold">
                        {match.player1Name} <span className="text-white/30">vs</span> {match.player2Name}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="font-mono text-sm text-white/58">{match.date}</p>
                      {match.time && <p className="mt-1 font-mono text-xl font-semibold text-[var(--accent-gold)]">{match.time}</p>}
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
          </section>
        ))
      )}
    </div>
  );
}
