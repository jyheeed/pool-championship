import Link from 'next/link';
import { cookies } from 'next/headers';
import { getStandings } from '@/lib/mongo-service';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage } from '@/lib/i18n';

export const revalidate = 60;

export default async function DrawPage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  let standings;

  try {
    standings = await getStandings();
  } catch {
    return <div className="panel p-12 text-center text-white/60">{language === 'fr' ? 'Impossible de charger les groupes.' : language === 'ar' ? 'تعذر تحميل المجموعات.' : 'Failed to load groups.'}</div>;
  }

  const groups: Record<string, typeof standings> = {};
  for (const standing of standings) {
    const key = standing.player.poolGroup || 'Unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(standing);
  }

  const groupKeys = Object.keys(groups).sort();
  const totalPlayers = standings.length;
  const groupSizes = groupKeys.map((group) => groups[group].length);
  const minSize = groupSizes.length ? Math.min(...groupSizes) : 0;
  const maxSize = groupSizes.length ? Math.max(...groupSizes) : 0;
  const isBalanced = minSize === maxSize;

  return (
    <div className="space-y-8 animate-in">
      <section className="pool-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.95fr] lg:items-end">
          <div>
            <p className="section-kicker text-[var(--accent-gold)]">{t.draw.seasonKicker('2026')}</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-6xl">{t.draw.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
              {t.draw.subtitle}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
              {t.draw.officialParagraph}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-card bg-white/6">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{t.draw.pools}</p>
              <p className="mt-2 text-4xl font-display text-[var(--accent-gold)]">{groupKeys.length}</p>
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
          <p className="mt-2 text-sm text-white/66">
            {t.draw.seededFirstText}
          </p>
        </div>
        <div className="panel p-5 md:p-6">
          <p className="section-kicker text-[var(--accent-red)]">{t.draw.balancedAllocation}</p>
          <p className="mt-2 text-sm text-white/66">
            {t.draw.balancedAllocationText}
          </p>
        </div>
      </section>

      {groupKeys.length === 0 ? (
        <div className="panel p-12 text-center text-white/60">{t.draw.noGroupsAssigned}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groupKeys.map((group) => (
            <section key={group} className="panel overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(12,26,24,0.96),rgba(7,18,17,0.96))]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 md:px-6">
                <div>
                  <p className="section-kicker text-[var(--accent-gold)]">{t.draw.pool}</p>
                  <h2 className="mt-1 text-2xl font-display md:text-3xl">{group}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/groups/${encodeURIComponent(group)}`}
                    className="rounded-full border border-white/14 bg-white/6 px-3 py-1 text-xs font-mono text-[var(--accent-blue)] transition hover:bg-white/12"
                  >
                    Details
                  </Link>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-white/60">
                    {t.draw.playersInGroup(groups[group].length)}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/6">
                {groups[group]
                  .slice()
                  .sort((a, b) => b.player.points - a.player.points || a.player.name.localeCompare(b.player.name))
                  .map((standing) => (
                    <div key={standing.player.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/players/${standing.player.id}`} className="truncate text-base font-semibold transition hover:text-[var(--accent-gold)] md:text-lg">
                            {standing.player.name}
                          </Link>
                          {standing.player.isSeeded && <span className="rounded-full border border-[rgba(255,194,71,0.25)] bg-[rgba(255,194,71,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-gold)]">{t.draw.seed}</span>}
                        </div>
                        <p className="mt-1 truncate text-xs text-white/55 md:text-sm">
                          {standing.player.club || standing.player.nationality}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-xl font-bold text-[var(--accent-gold)] md:text-2xl">{standing.player.points}</p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">{t.draw.points}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
