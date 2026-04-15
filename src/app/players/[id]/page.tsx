import { getPlayer, getMatches } from '@/lib/mongo-service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getTranslations, normalizeLanguage, translateStatus } from '@/lib/i18n';

export const revalidate = 60;

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const t = getTranslations(language);

  const { id } = await params;
  let player, matches;
  try {
    player = await getPlayer(id);
    if (!player) return notFound();
    const allMatches = await getMatches();
    matches = allMatches
      .filter(m => m.player1Id === id || m.player2Id === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return notFound();
  }

  const winRate = player.played > 0 ? Math.round((player.wins / player.played) * 100) : 0;

  return (
    <div className="space-y-6 animate-in">
      <Link href="/players" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <ArrowLeft size={14} /> {t.playerDetail.backToPlayers}
      </Link>

      {/* Profile Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-green)]/30 bg-[var(--bg-secondary)] font-display text-3xl text-[var(--accent-green)]">
            {player.photoUrl ? (
              <Image src={player.photoUrl} alt={player.name} fill className="object-cover" unoptimized />
            ) : (
              player.name.charAt(0)
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl">{player.name}</h1>
            {player.nickname && <p className="text-[var(--text-secondary)]">&ldquo;{player.nickname}&rdquo;</p>}
            <p className="text-sm text-[var(--text-muted)]">
              {player.nationality}
              {player.age ? ` · ${language === 'fr' ? `${player.age} ans` : language === 'ar' ? `${player.age} سنة` : `${player.age} years`}` : ''}
              {player.club ? ` · ${player.club}` : ''}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
          {[
            { label: t.playerDetail.points, val: player.points, big: true },
            { label: t.playerDetail.played, val: player.played },
            { label: t.playerDetail.wins, val: player.wins, color: 'text-green-400' },
            { label: t.playerDetail.losses, val: player.losses, color: 'text-red-400' },
            { label: t.playerDetail.winRate, val: `${winRate}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
              <p className={`font-mono ${s.big ? 'text-2xl' : 'text-xl'} font-bold ${s.color || ''}`}>{s.val}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Frames */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="text-[var(--text-muted)]">{t.playerDetail.frames}</span>
          <span className="flex items-center gap-1 text-green-400">
            <TrendingUp size={14} /> {player.framesWon} {t.playerDetail.won}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <TrendingDown size={14} /> {player.framesLost} {t.playerDetail.lost}
          </span>
          <span className={`font-mono font-bold ${player.frameDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({player.frameDiff > 0 ? '+' : ''}{player.frameDiff})
          </span>
        </div>
      </div>

      {/* Match History */}
      <section>
        <h2 className="font-display text-xl mb-4">{t.playerDetail.matchHistory}</h2>
        <div className="space-y-2 stagger">
          {matches.map(m => {
            const isP1 = m.player1Id === id;
            const myScore = isP1 ? m.score1 : m.score2;
            const oppScore = isP1 ? m.score2 : m.score1;
            const oppName = isP1 ? m.player2Name : m.player1Name;
            const won = myScore !== null && oppScore !== null && myScore > oppScore;

            return (
              <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{m.round} · {m.date}</p>
                  <p className="font-medium mt-0.5">{t.playerDetail.vs} {oppName}</p>
                </div>
                <div className="flex items-center gap-3">
                  {m.status === 'completed' ? (
                    <>
                      <span className="font-mono text-lg font-bold">{myScore} - {oppScore}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {won ? t.playerDetail.shortWin : t.playerDetail.shortLoss}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase">{translateStatus(language, m.status)}</span>
                  )}
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm">{t.playerDetail.noMatches}</p>
          )}
        </div>
      </section>
    </div>
  );
}
