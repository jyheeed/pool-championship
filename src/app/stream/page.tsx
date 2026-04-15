'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, Radio, Wifi, WifiOff } from 'lucide-react';
import { normalizeLanguage, type Language } from '@/lib/i18n';
import type { Match } from '@/lib/types';
import type { MatchOverlayState, StreamEventEntry, StreamSseMessage } from '@/lib/stream-types';

const LANGUAGE_COOKIE = 'pool-lang';

function getLanguage(): Language {
  if (typeof document === 'undefined') return 'fr';
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
  return normalizeLanguage(match ? decodeURIComponent(match[1]) : 'fr');
}

function tx(language: Language, fr: string, en: string, ar: string): string {
  if (language === 'en') return en;
  if (language === 'ar') return ar;
  return fr;
}

const BALL_STYLES: Record<number, { color: string; stripe: boolean }> = {
  1: { color: '#f5e042', stripe: false },
  2: { color: '#2563eb', stripe: false },
  3: { color: '#dc2626', stripe: false },
  4: { color: '#7c3aed', stripe: false },
  5: { color: '#f97316', stripe: false },
  6: { color: '#16a34a', stripe: false },
  7: { color: '#8b2500', stripe: false },
  8: { color: '#111111', stripe: false },
  9: { color: '#f5e042', stripe: true },
  10: { color: '#2563eb', stripe: true },
  11: { color: '#dc2626', stripe: true },
  12: { color: '#7c3aed', stripe: true },
  13: { color: '#f97316', stripe: true },
  14: { color: '#16a34a', stripe: true },
  15: { color: '#8b2500', stripe: true },
};

function phaseLabel(language: Language, phase: MatchOverlayState['tablePhase']): string {
  if (phase === 'motion') return tx(language, 'Mouvement', 'Motion', 'حركة');
  if (phase === 'stabilizing') return tx(language, 'Stabilisation', 'Stabilizing', 'استقرار');
  if (phase === 'stable_confirmed') return tx(language, 'Stable confirmé', 'Stable confirmed', 'استقرار مؤكد');
  return tx(language, 'Inactif', 'Idle', 'خامل');
}

function disciplineLabel(language: Language, discipline: MatchOverlayState['discipline']): string {
  if (discipline === '9-ball') return tx(language, '9 billes', '9-ball', '9 كرات');
  if (discipline === '10-ball') return tx(language, '10 billes', '10-ball', '10 كرات');
  return tx(language, '8 billes', '8-ball', '8 كرات');
}

function connectionLabel(language: Language, state: MatchOverlayState['connectionState'] | 'connecting'): string {
  if (state === 'connected') return tx(language, 'Connecté', 'Connected', 'متصل');
  if (state === 'degraded') return tx(language, 'Dégradé', 'Degraded', 'متدهور');
  if (state === 'disconnected') return tx(language, 'Déconnecté', 'Disconnected', 'غير متصل');
  return tx(language, 'Connexion...', 'Connecting...', 'جار الاتصال...');
}

function statusLabel(language: Language, status: MatchOverlayState['status']): string {
  if (status === 'live') return tx(language, 'Direct', 'Live', 'مباشر');
  if (status === 'scheduled') return tx(language, 'Programmé', 'Scheduled', 'مجدولة');
  if (status === 'completed') return tx(language, 'Terminé', 'Completed', 'منتهية');
  if (status === 'postponed') return tx(language, 'Reporté', 'Postponed', 'مؤجلة');
  return tx(language, 'En attente', 'Waiting', 'انتظار');
}

function BallChip({ ball }: { ball: number }) {
  const style = BALL_STYLES[ball] || { color: '#666', stripe: false };
  const background = style.stripe
    ? `radial-gradient(circle at 50% 50%, #ffffff 35%, ${style.color} 37%)`
    : style.color;

  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white shadow"
      style={{ background }}
      title={`Ball ${ball}`}
    >
      {ball}
    </div>
  );
}

function StreamContent() {
  const searchParams = useSearchParams();
  const overlayMode = searchParams.get('overlay') === 'true';
  const urlMatchId = searchParams.get('matchId') || '';

  const [language, setLanguage] = useState<Language>('fr');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [state, setState] = useState<MatchOverlayState | null>(null);
  const [events, setEvents] = useState<StreamEventEntry[]>([]);
  const [connectionState, setConnectionState] = useState<MatchOverlayState['connectionState'] | 'connecting'>('connecting');
  const [lastMessageAt, setLastMessageAt] = useState<number>(Date.now());
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    setLanguage(getLanguage());
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/public/matches')
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled || !payload.success) return;

        const rows = payload.data as Match[];
        setMatches(rows);

        const preferred =
          (urlMatchId && rows.find((m) => m.id === urlMatchId)?.id) ||
          rows.find((m) => m.status === 'live')?.id ||
          rows.find((m) => m.status === 'scheduled')?.id ||
          rows[0]?.id ||
          '';

        setSelectedMatchId(preferred);
      })
      .catch(() => {
        if (!cancelled) {
          setMatches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [urlMatchId]);

  useEffect(() => {
    if (!selectedMatchId) return;

    setLoadingState(true);
    fetch(`/api/stream/state?matchId=${encodeURIComponent(selectedMatchId)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (!payload.success) return;
        setState(payload.data.state as MatchOverlayState);
        setEvents(payload.data.events as StreamEventEntry[]);
        setConnectionState((payload.data.state as MatchOverlayState).connectionState);
      })
      .finally(() => setLoadingState(false));
  }, [selectedMatchId]);

  useEffect(() => {
    if (!selectedMatchId) return;

    setConnectionState('connecting');
    const source = new EventSource(`/api/stream/events?matchId=${encodeURIComponent(selectedMatchId)}`);

    source.onopen = () => {
      setConnectionState('connected');
      setLastMessageAt(Date.now());
    };

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as StreamSseMessage;
      setLastMessageAt(Date.now());

      if (payload.type === 'match_state_updated') {
        setState(payload.state);
        setConnectionState(payload.state.connectionState);
      }

      if (payload.type === 'stream_event') {
        setEvents((prev) => [payload.event, ...prev].slice(0, 40));
      }
    };

    source.onerror = () => {
      setConnectionState((prev) => (prev === 'connected' ? 'degraded' : 'disconnected'));
    };

    return () => {
      source.close();
    };
  }, [selectedMatchId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const staleMs = Date.now() - lastMessageAt;
      if (staleMs > 15000 && connectionState === 'connected') {
        setConnectionState('degraded');
      }
      if (staleMs > 30000 && connectionState === 'degraded') {
        setConnectionState('disconnected');
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [connectionState, lastMessageAt]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId),
    [matches, selectedMatchId]
  );

  if (!selectedMatchId && !loadingState) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
        {tx(language, 'Aucun match disponible pour le flux live.', 'No match is available for live stream.', 'لا توجد مباراة متاحة للبث المباشر.')}
      </div>
    );
  }

  if (overlayMode) {
    return (
      <div className="fixed inset-0 pointer-events-none flex items-end justify-center p-6 md:p-8">
        <div className="w-full max-w-5xl rounded-2xl border border-white/20 bg-black/70 p-5 md:p-6 backdrop-blur-md">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{state?.player1.name || selectedMatch?.player1Name || 'Player 1'}</p>
              <p className="text-5xl font-black text-[var(--accent-gold)]">{state?.player1.score ?? selectedMatch?.score1 ?? 0}</p>
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{tx(language, 'Frame', 'Frame', 'شوط')}</p>
              <p className="text-3xl font-mono font-bold text-white">{state?.frameNumber ?? 1}</p>
              <p className="mt-1 text-xs text-white/70">{state ? disciplineLabel(language, state.discipline) : '8-ball'}</p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-white">{state?.player2.name || selectedMatch?.player2Name || 'Player 2'}</p>
              <p className="text-5xl font-black text-[var(--accent-gold)]">{state?.player2.score ?? selectedMatch?.score2 ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(state?.ballsRemaining || []).map((ball) => (
                <BallChip key={ball} ball={ball} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                {statusLabel(language, state?.status || 'waiting')} • {phaseLabel(language, state?.tablePhase || 'idle')}
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                {connectionLabel(language, connectionState)}
              </div>
              {state?.reviewRequired && (
                <div className="rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs text-amber-200">
                  {tx(language, 'Revue requise', 'Review required', 'مراجعة مطلوبة')}
                </div>
              )}
            </div>
          </div>

          {state?.reviewRequired && state.reviewReason && (
            <div className="mt-2 text-xs text-amber-100/90">
              {state.reviewReason}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Radio size={22} className="text-red-400" />
          <h1 className="font-display text-2xl">{tx(language, 'Stream HUD', 'Stream HUD', 'واجهة البث')}</h1>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
            {state ? statusLabel(language, state.status) : tx(language, 'Chargement', 'Loading', 'تحميل')}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
            {state ? phaseLabel(language, state.tablePhase) : tx(language, 'Inactif', 'Idle', 'خامل')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
          >
            <option value="">{tx(language, 'Choisir un match', 'Select a match', 'اختر مباراة')}</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.player1Name} vs {match.player2Name} ({match.round})
              </option>
            ))}
          </select>
          <a
            href={`/stream?overlay=true${selectedMatchId ? `&matchId=${encodeURIComponent(selectedMatchId)}` : ''}`}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            {tx(language, 'URL Overlay OBS', 'OBS Overlay URL', 'رابط طبقة OBS')}
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/65">{tx(language, 'Joueur 1', 'Player 1', 'اللاعب 1')}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{state?.player1.name || selectedMatch?.player1Name || '-'}</p>
              <p className="mt-2 text-5xl font-mono font-bold text-[var(--accent-gold)]">{state?.player1.score ?? selectedMatch?.score1 ?? 0}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/65">{tx(language, 'Joueur 2', 'Player 2', 'اللاعب 2')}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{state?.player2.name || selectedMatch?.player2Name || '-'}</p>
              <p className="mt-2 text-5xl font-mono font-bold text-[var(--accent-gold)]">{state?.player2.score ?? selectedMatch?.score2 ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{tx(language, 'Discipline', 'Discipline', 'النمط')}</p>
              <p className="mt-2 text-lg font-semibold text-white">{state ? disciplineLabel(language, state.discipline) : '-'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{tx(language, 'Frame', 'Frame', 'شوط')}</p>
              <p className="mt-2 text-lg font-semibold text-white">{state?.frameNumber ?? 1}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{tx(language, 'Connexion', 'Connection', 'الاتصال')}</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                {connectionState === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
                {connectionLabel(language, connectionState)}
              </p>
            </div>
          </div>

          {state?.reviewRequired && (
            <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-200">
              <strong>{tx(language, 'Revue requise:', 'Review required:', 'مراجعة مطلوبة:')}</strong> {state.reviewReason}
            </div>
          )}

          <div className="mt-5">
            <h2 className="text-sm uppercase tracking-[0.22em] text-white/45">{tx(language, 'Billes restantes', 'Remaining balls', 'الكرات المتبقية')}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(state?.ballsRemaining || []).map((ball) => (
                <BallChip key={ball} ball={ball} />
              ))}
            </div>
            {state && state.ballsRemaining.length === 0 && (
              <p className="mt-2 text-sm text-white/55">
                {tx(language, 'Aucune bille détectée sur la table.', 'No balls detected on the table.', 'لم يتم اكتشاف كرات على الطاولة.')}
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="text-xs uppercase tracking-[0.22em] text-white/45">{tx(language, 'État Vision', 'Vision status', 'حالة الرؤية')}</h3>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <p className="flex items-center gap-2"><Activity size={15} /> {state ? phaseLabel(language, state.tablePhase) : '-'}</p>
              <p>{tx(language, 'Stable frames:', 'Stable frames:', 'إطارات الاستقرار:')} {state?.stableFrames ?? 0}</p>
              <p>{tx(language, 'Dernier snapshot:', 'Last snapshot:', 'آخر لقطة:')} {state?.lastSnapshotId || '-'}</p>
              <p>{tx(language, 'Dernier signal vision:', 'Last vision signal:', 'آخر إشارة رؤية:')} {state?.lastVisionAt || '-'}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="text-xs uppercase tracking-[0.22em] text-white/45">{tx(language, 'Journal événements', 'Event log', 'سجل الأحداث')}</h3>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-white/55">{tx(language, 'Aucun événement reçu.', 'No events received.', 'لم يتم استقبال أحداث.')}</p>
              ) : (
                events.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <p className="text-xs text-white/85">{entry.message}</p>
                    <p className="mt-1 text-[10px] text-white/45">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function StreamPage() {
  const language = getLanguage();

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center font-mono text-white/40">
          {tx(language, 'Chargement du flux live...', 'Loading live stream...', 'جار تحميل البث المباشر...')}
        </div>
      }
    >
      <StreamContent />
    </Suspense>
  );
}

