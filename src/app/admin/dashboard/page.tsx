'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Save, Trash2, LogOut, Users, Swords, RefreshCw, Settings, Building2, UserCheck, Shuffle } from 'lucide-react';
import { normalizeLanguage, type Language } from '@/lib/i18n';

const LANGUAGE_COOKIE = 'pool-lang';

function getLanguage(): Language {
  if (typeof document === 'undefined') return 'fr';
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
  return normalizeLanguage(match ? decodeURIComponent(match[1]) : 'fr');
}

function tx(language: Language, fr: string, en: string, ar: string) {
  if (language === 'en') return en;
  if (language === 'ar') return ar;
  return fr;
}

interface PlayerForm {
  id: string;
  name: string;
  nickname: string;
  nationality: string;
  age: string;
  club: string;
  photo_url: string;
  pool_group: string;
  is_seeded: string;
}

interface Registration {
  id: string;
  name: string;
  nickname?: string;
  nationality: string;
  age?: number;
  email: string;
  phone: string;
  city: string;
  cin?: string;
  club?: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

interface MatchForm {
  id: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  player1_id: string;
  player2_id: string;
  score1: string;
  score2: string;
  status: string;
  frame_scores: string;
  notes: string;
  discipline: string;
}

interface SettingsForm {
  name: string;
  season: string;
  pointsWin: string;
  pointsLoss: string;
  logo: string;
  heroTitle: string;
  heroSubtitle: string;
  venuesText: string;
}

interface FixtureEventForm {
  id: string;
  title: string;
  date: string;
  note: string;
  venue: string;
}

interface MatchScheduleEdit {
  date: string;
  time: string;
  venue: string;
}

interface ClubForm {
  id: string;
  name: string;
  city: string;
  logo_url: string;
}

const DEFAULT_GROUP_NAMES = Array.from({ length: 20 }, (_, index) => `Group ${String.fromCharCode(65 + index)}`).join(', ');

type PublicPlayerData = {
  id: string;
  name: string;
  nickname?: string;
  nationality?: string;
  age?: number;
  club?: string;
  photoUrl?: string;
  poolGroup?: string;
  isSeeded?: boolean;
};

type PublicMatchData = {
  id: string;
  round: string;
  date: string;
  time?: string;
  venue?: string;
  player1Id: string;
  player2Id: string;
  score1?: number;
  score2?: number;
  status: string;
  frameScores?: string;
  notes?: string;
  discipline?: string;
};

type PublicClubData = {
  id: string;
  name: string;
  city?: string;
  logoUrl?: string;
};

const emptyPlayer: PlayerForm = { id: '', name: '', nickname: '', nationality: '', age: '', club: '', photo_url: '', pool_group: '', is_seeded: 'false' };
const emptyMatch: MatchForm = { id: '', round: '', date: '', time: '', venue: '', player1_id: '', player2_id: '', score1: '', score2: '', status: 'scheduled', frame_scores: '', notes: '', discipline: '' };
const emptySettings: SettingsForm = {
  name: '',
  season: '2026',
  pointsWin: '3',
  pointsLoss: '0',
  logo: '',
  heroTitle: '',
  heroSubtitle: '',
  venuesText: '',
};
const emptyClub: ClubForm = { id: '', name: '', city: '', logo_url: '' };

export default function AdminDashboard() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('fr');
  const [tab, setTab] = useState<'players' | 'matches' | 'clubs' | 'registrations' | 'settings'>('players');
  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [matches, setMatches] = useState<MatchForm[]>([]);
  const [clubs, setClubs] = useState<ClubForm[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayer);
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatch);
  const [clubForm, setClubForm] = useState<ClubForm>(emptyClub);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(emptySettings);
  const [fixtureEvents, setFixtureEvents] = useState<FixtureEventForm[]>([]);
  const [matchScheduleEdits, setMatchScheduleEdits] = useState<Record<string, MatchScheduleEdit>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [playerQuery, setPlayerQuery] = useState('');
  const [matchQuery, setMatchQuery] = useState('');
  const [clubQuery, setClubQuery] = useState('');
  const [groupNames, setGroupNames] = useState(DEFAULT_GROUP_NAMES);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [pRes, mRes, cRes, sRes, rRes] = await Promise.all([
        fetch('/api/public/players'),
        fetch('/api/public/matches'),
        fetch('/api/public/clubs'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/registrations'),
      ]);
      const pData = await pRes.json();
      const mData = await mRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      const rData = await rRes.json();

      if (pData.data) {
        setPlayers(
          (pData.data as PublicPlayerData[]).map((p) => ({
            id: p.id,
            name: p.name,
            nickname: p.nickname || '',
            nationality: p.nationality || '',
            age: p.age?.toString() || '',
            club: p.club || '',
            photo_url: p.photoUrl || '',
            pool_group: p.poolGroup || '',
            is_seeded: p.isSeeded ? 'true' : 'false',
          }))
        );
      }

      if (mData.data) {
        const nextMatches = (mData.data as PublicMatchData[]).map((m) => ({
            id: m.id,
            round: m.round,
            date: m.date,
            time: m.time || '',
            venue: m.venue || '',
            player1_id: m.player1Id,
            player2_id: m.player2Id,
            score1: m.score1?.toString() || '',
            score2: m.score2?.toString() || '',
            status: m.status,
            frame_scores: m.frameScores || '',
            notes: m.notes || '',
            discipline: m.discipline || '',
          }));

        setMatches(nextMatches);
        const nextScheduleEdits = nextMatches.reduce<Record<string, MatchScheduleEdit>>((acc, match) => {
          acc[match.id] = {
            date: match.date,
            time: match.time,
            venue: match.venue,
          };
          return acc;
        }, {});
        setMatchScheduleEdits(nextScheduleEdits);
      }

      if (cData.data) {
        setClubs(
          (cData.data as PublicClubData[]).map((c) => ({
            id: c.id,
            name: c.name,
            city: c.city || '',
            logo_url: c.logoUrl || '',
          }))
        );
      }

      if (rData.data) {
        setRegistrations(rData.data);
      }

      if (sData.data) {
        const nextFixtureEvents = Array.isArray(sData.data.fixtureEvents)
          ? sData.data.fixtureEvents.map((event: { id?: string; title?: string; date?: string; note?: string; venue?: string }, index: number) => ({
              id: event.id || `event-${index + 1}`,
              title: event.title || '',
              date: event.date || '',
              note: event.note || '',
              venue: event.venue || '',
            }))
          : [];
        setFixtureEvents(nextFixtureEvents);

        const venuesText = Array.isArray(sData.data.venues)
          ? sData.data.venues.join('\n')
          : '';

        setSettingsForm({
          name: sData.data.name || '',
          season: sData.data.season || '2026',
          pointsWin: String(sData.data.pointsWin ?? 3),
          pointsLoss: String(sData.data.pointsLoss ?? 0),
          logo: sData.data.logo || '',
          heroTitle: sData.data.heroTitle || '',
          heroSubtitle: sData.data.heroSubtitle || '',
          venuesText,
        });
      }

    } catch {
      setMsg(tx(language, 'Erreur lors du chargement des données admin', 'Error while loading admin data', 'خطأ أثناء تحميل بيانات الإدارة'));
    }
  }, [language]);

  useEffect(() => {
    setLanguage(getLanguage());
    fetch('/api/auth/check')
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) router.push('/admin/login');
        else {
          setAuthed(true);
          load();
        }
      });
  }, [router, load]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(''), 3000);
  }

  async function savePlayer() {
    setLoading(true);
    const isEdit = editing !== null;
    const res = await fetch('/api/admin/players', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerForm),
    });
    const d = await res.json();
    flash(d.success ? (isEdit ? tx(language, 'Joueur mis à jour', 'Player updated', 'تم تحديث اللاعب') : tx(language, 'Joueur ajouté', 'Player added', 'تمت إضافة اللاعب')) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setPlayerForm(emptyPlayer);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  async function saveMatch() {
    setLoading(true);
    const isEdit = editing !== null;
    const res = await fetch('/api/admin/matches', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchForm),
    });
    const d = await res.json();
    flash(d.success ? (isEdit ? tx(language, 'Match mis à jour', 'Match updated', 'تم تحديث المباراة') : tx(language, 'Match ajouté', 'Match added', 'تمت إضافة المباراة')) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setMatchForm(emptyMatch);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  async function saveClub() {
    setLoading(true);
    const isEdit = editing !== null;
    const res = await fetch('/api/admin/clubs', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clubForm),
    });
    const d = await res.json();
    flash(d.success ? (isEdit ? tx(language, 'Club mis à jour', 'Club updated', 'تم تحديث النادي') : tx(language, 'Club ajouté', 'Club added', 'تمت إضافة النادي')) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setClubForm(emptyClub);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  async function saveSettings() {
    if (hasInvalidFixtureEvents) {
      flash(
        tx(
          language,
          'Complétez les événements en rouge (titre, date, note) avant d’enregistrer.',
          'Complete highlighted events (title, date, note) before saving.',
          'أكمل الفعاليات المظللة بالأحمر (العنوان، التاريخ، الملاحظة) قبل الحفظ.'
        )
      );
      return;
    }

    setLoading(true);

    const sanitizedFixtureEvents = fixtureEvents
      .map((event, index) => ({
        id: (event.id || `event-${index + 1}`).trim(),
        title: event.title.trim(),
        date: event.date.trim(),
        note: event.note.trim(),
        venue: event.venue.trim() || undefined,
      }))
      .filter((event) => event.id && event.title && event.date && event.note);

    const venues = settingsForm.venuesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settingsForm.name,
        season: settingsForm.season,
        pointsWin: Number(settingsForm.pointsWin || 0),
        pointsLoss: Number(settingsForm.pointsLoss || 0),
        logo: settingsForm.logo,
        heroTitle: settingsForm.heroTitle,
        heroSubtitle: settingsForm.heroSubtitle,
        fixtureEvents: sanitizedFixtureEvents,
        venues,
      }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, 'Paramètres mis à jour', 'Settings updated', 'تم تحديث الإعدادات') : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) await load();
    setLoading(false);
  }

  function addFixtureEvent() {
    setFixtureEvents((prev) => ([
      ...prev,
      {
        id: `event-${prev.length + 1}`,
        title: '',
        date: '',
        note: '',
        venue: '',
      },
    ]));
  }

  function updateFixtureEvent(index: number, patch: Partial<FixtureEventForm>) {
    setFixtureEvents((prev) => prev.map((event, i) => (i === index ? { ...event, ...patch } : event)));
  }

  function removeFixtureEvent(index: number) {
    setFixtureEvents((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveMatchScheduleInline(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    const patch = matchScheduleEdits[matchId];
    if (!match || !patch) return;

    const payload = {
      ...match,
      date: patch.date,
      time: patch.time,
      venue: patch.venue,
    };

    setLoading(true);
    const res = await fetch('/api/admin/matches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    flash(d.success ? tx(language, 'Match mis à jour', 'Match updated', 'تم تحديث المباراة') : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      await load();
    }
    setLoading(false);
  }

  async function handleRegistration(id: string, status: 'approved' | 'rejected') {
    setLoading(true);
    const res = await fetch('/api/admin/registrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const d = await res.json();
    flash(d.success ? `${tx(language, 'Inscription', 'Registration', 'التسجيل')} ${status}` : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) await load();
    setLoading(false);
  }

  async function deleteRegistration(id: string) {
    if (!confirm(tx(language, 'Supprimer cette inscription ?', 'Delete this registration?', 'حذف هذا التسجيل؟'))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/registrations?id=${id}`, { method: 'DELETE' });
    const d = await res.json();
    flash(d.success ? tx(language, 'Inscription supprimée', 'Registration deleted', 'تم حذف التسجيل') : d.error || tx(language, 'Erreur lors de la suppression de l’inscription', 'Error deleting registration', 'خطأ أثناء حذف التسجيل'));
    if (d.success) await load();
    setLoading(false);
  }

  async function runDraw() {
    if (!confirm(tx(language, 'Cette action répartira les joueurs en groupes équilibrés et gardera les têtes de série dans leur groupe actuel. Continuer ?', 'This will assign players into balanced groups and keep manually seeded players in their current Group. Continue?', 'سيتم توزيع اللاعبين على مجموعات متوازنة مع إبقاء المصنفين في مجموعاتهم الحالية. هل تريد المتابعة؟'))) return;
    setLoading(true);
    const names = groupNames.split(',').map((n) => n.trim()).filter(Boolean);
    const res = await fetch('/api/admin/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupNames: names }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, 'Tirage terminé !', 'Draw complete!', 'اكتمل السحب!') : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) await load();
    setLoading(false);
  }

  async function deletePlayer() {
    if (!editing || !confirm(tx(language, 'Supprimer ce joueur ?', 'Delete this player?', 'حذف هذا اللاعب؟'))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/players?id=${editing}`, { method: 'DELETE' });
    const d = await res.json();
    flash(d.success ? tx(language, 'Joueur supprimé', 'Player deleted', 'تم حذف اللاعب') : d.error || tx(language, 'Erreur lors de la suppression du joueur', 'Error deleting player', 'خطأ أثناء حذف اللاعب'));
    if (d.success) {
      setPlayerForm(emptyPlayer);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  async function updatePlayerQuick(player: PlayerForm, patch: Partial<PlayerForm>, successMessage: string) {
    setLoading(true);
    const res = await fetch('/api/admin/players', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...player, ...patch }),
    });
    const d = await res.json();
    flash(d.success ? successMessage : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      await load();
    }
    setLoading(false);
  }

  async function assignGroup(player: PlayerForm) {
    const availableGroups = groupNames
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const defaultGroup = player.pool_group || availableGroups[0] || 'Group A';
    const nextGroup = window.prompt(tx(language, `Saisissez la poule pour ${player.name} :`, `Enter the pool group for ${player.name}:`, `أدخل المجموعة للاعب ${player.name}:`), defaultGroup);

    if (nextGroup === null) return;

    const poolGroup = nextGroup.trim();
    if (!poolGroup) {
      flash(tx(language, 'La poule est obligatoire', 'Pool group is required', 'المجموعة مطلوبة'));
      return;
    }

    await updatePlayerQuick(player, { pool_group: poolGroup }, tx(language, `${player.name} affecté à ${poolGroup}`, `${player.name} assigned to ${poolGroup}`, `تم إسناد ${player.name} إلى ${poolGroup}`));
  }

  async function toggleSeedPlayer(player: PlayerForm) {
    if (player.is_seeded === 'true') {
      await updatePlayerQuick(player, { is_seeded: 'false' }, tx(language, `${player.name} retiré des têtes de série`, `${player.name} removed from seeded players`, `تمت إزالة ${player.name} من المصنفين`));
      return;
    }

    let poolGroup = player.pool_group.trim();
    if (!poolGroup) {
      const availableGroups = groupNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      const suggestedGroup = availableGroups[0] || 'Group A';
      const nextGroup = window.prompt(tx(language, `Assignez une poule pour classer ${player.name} tête de série :`, `Assign a group to seed ${player.name}:`, `عيّن مجموعة لتصنيف ${player.name}:`), suggestedGroup);
      if (nextGroup === null) return;
      poolGroup = nextGroup.trim();
      if (!poolGroup) {
        flash(tx(language, 'Une poule est obligatoire pour classer une tête de série', 'Pool group is required to seed a player', 'المجموعة مطلوبة لتصنيف اللاعب'));
        return;
      }
    }

    await updatePlayerQuick(player, { pool_group: poolGroup, is_seeded: 'true' }, tx(language, `${player.name} tête de série dans ${poolGroup}`, `${player.name} seeded in ${poolGroup}`, `تم تصنيف ${player.name} في ${poolGroup}`));
  }

  async function deleteMatch(id?: string) {
    const targetId = id || editing;
    if (!targetId || !confirm(tx(language, 'Supprimer ce match ?', 'Delete this match?', 'حذف هذه المباراة؟'))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/matches?id=${targetId}`, { method: 'DELETE' });
    const d = await res.json();
    flash(d.success ? tx(language, 'Match supprimé', 'Match deleted', 'تم حذف المباراة') : d.error || tx(language, 'Erreur lors de la suppression du match', 'Error deleting match', 'خطأ أثناء حذف المباراة'));
    if (d.success) {
      setMatchForm(emptyMatch);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  function togglePlayerSelection(playerId: string) {
    const next = new Set(selectedPlayerIds);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    setSelectedPlayerIds(next);
  }

  function toggleMatchSelection(matchId: string) {
    const next = new Set(selectedMatchIds);
    if (next.has(matchId)) next.delete(matchId);
    else next.add(matchId);
    setSelectedMatchIds(next);
  }

  function selectAllFilteredPlayers() {
    if (selectedPlayerIds.size === filteredPlayers.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(filteredPlayers.map((p) => p.id)));
    }
  }

  function selectAllFilteredMatches() {
    if (selectedMatchIds.size === filteredMatches.length) {
      setSelectedMatchIds(new Set());
    } else {
      setSelectedMatchIds(new Set(filteredMatches.map((m) => m.id)));
    }
  }

  async function bulkSeedPlayers() {
    if (selectedPlayerIds.size === 0 || !confirm(tx(language, 'Classer ces joueurs comme têtes de série ?', 'Seed these players?', 'تصنيف هؤلاء اللاعبين؟'))) return;
    setLoading(true);
    const availableGroups = groupNames.split(',').map((n) => n.trim()).filter(Boolean);
    const group = window.prompt(tx(language, 'Groupe pour les têtes de série :', 'Group for seeded players:', 'المجموعة للمصنفين:'), availableGroups[0] || 'Group A');
    if (!group) { setLoading(false); return; }
    
    const ids = Array.from(selectedPlayerIds);
    const res = await fetch('/api/admin/players/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed', ids, poolGroup: group }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, `${ids.length} joueurs classés`, `${ids.length} players seeded`, `${ids.length} تم تصنيف اللاعبين`) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setSelectedPlayerIds(new Set());
      await load();
    }
    setLoading(false);
  }

  async function bulkUnseedPlayers() {
    if (selectedPlayerIds.size === 0 || !confirm(tx(language, 'Retirer le classement de ces joueurs ?', 'Unseed these players?', 'إلغاء تصنيف هؤلاء اللاعبين؟'))) return;
    setLoading(true);
    const ids = Array.from(selectedPlayerIds);
    const res = await fetch('/api/admin/players/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unseed', ids }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, `${ids.length} joueurs non classés`, `${ids.length} players unseeded`, `${ids.length} تم إلغاء تصنيف اللاعبين`) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setSelectedPlayerIds(new Set());
      await load();
    }
    setLoading(false);
  }

  async function bulkDeletePlayers() {
    if (selectedPlayerIds.size === 0 || !confirm(tx(language, `Supprimer ${selectedPlayerIds.size} joueur(s) ?`, `Delete ${selectedPlayerIds.size} player(s)?`, `حذف ${selectedPlayerIds.size} لاعب/لاعبين؟`))) return;
    setLoading(true);
    const ids = Array.from(selectedPlayerIds);
    const res = await fetch('/api/admin/players/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, `${ids.length} joueurs supprimés`, `${ids.length} players deleted`, `${ids.length} تم حذف اللاعبين`) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setSelectedPlayerIds(new Set());
      await load();
    }
    setLoading(false);
  }

  async function bulkDeleteMatches() {
    if (selectedMatchIds.size === 0 || !confirm(tx(language, `Supprimer ${selectedMatchIds.size} match(s) ?`, `Delete ${selectedMatchIds.size} match(es)?`, `حذف ${selectedMatchIds.size} مباراة/مباريات؟`))) return;
    setLoading(true);
    const ids = Array.from(selectedMatchIds);
    const res = await fetch('/api/admin/matches/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    });
    const d = await res.json();
    flash(d.success ? tx(language, `${ids.length} matchs supprimés`, `${ids.length} matches deleted`, `${ids.length} تم حذف المباريات`) : d.error || tx(language, 'Erreur', 'Error', 'خطأ'));
    if (d.success) {
      setSelectedMatchIds(new Set());
      await load();
    }
    setLoading(false);
  }

  async function deleteClub() {
    if (!editing || !confirm(tx(language, 'Supprimer ce club ?', 'Delete this club?', 'حذف هذا النادي؟'))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/clubs?id=${editing}`, { method: 'DELETE' });
    const d = await res.json();
    flash(d.success ? tx(language, 'Club supprimé', 'Club deleted', 'تم حذف النادي') : d.error || tx(language, 'Erreur lors de la suppression du club', 'Error deleting club', 'خطأ أثناء حذف النادي'));
    if (d.success) {
      setClubForm(emptyClub);
      setEditing(null);
      await load();
    }
    setLoading(false);
  }

  function editPlayer(p: PlayerForm) {
    setPlayerForm(p);
    setEditing(p.id);
    setTab('players');
  }

  function editMatch(m: MatchForm) {
    setMatchForm(m);
    setEditing(m.id);
    setTab('matches');
  }

  function editClub(c: ClubForm) {
    setClubForm(c);
    setEditing(c.id);
    setTab('clubs');
  }

  function resetForms(nextTab: 'players' | 'matches' | 'clubs' | 'registrations' | 'settings') {
    setTab(nextTab);
    setEditing(null);
    setPlayerForm(emptyPlayer);
    setMatchForm(emptyMatch);
    setClubForm(emptyClub);
  }

  const filteredPlayers = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => [p.id, p.name, p.nickname, p.club, p.pool_group].some((value) => value.toLowerCase().includes(q)));
  }, [players, playerQuery]);

  const filteredMatches = useMemo(() => {
    const q = matchQuery.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const p1Name = players.find((p) => p.id === m.player1_id)?.name || m.player1_id;
      const p2Name = players.find((p) => p.id === m.player2_id)?.name || m.player2_id;
      return [m.id, m.round, m.status, m.date, p1Name, p2Name].some((value) => value.toLowerCase().includes(q));
    });
  }, [matches, matchQuery, players]);

  const filteredClubs = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) => [c.id, c.name, c.city].some((value) => value.toLowerCase().includes(q)));
  }, [clubs, clubQuery]);

  const venueOptions = useMemo(
    () => Array.from(new Set(settingsForm.venuesText.split('\n').map((line) => line.trim()).filter(Boolean))),
    [settingsForm.venuesText]
  );

  const fixtureEventValidation = useMemo(
    () =>
      fixtureEvents.map((event) => {
        const normalized = {
          id: event.id.trim(),
          title: event.title.trim(),
          date: event.date.trim(),
          note: event.note.trim(),
          venue: event.venue.trim(),
        };
        const hasAnyValue = Object.values(normalized).some(Boolean);
        const missingRequired: string[] = [];
        if (hasAnyValue && !normalized.title) missingRequired.push(tx(language, 'titre', 'title', 'العنوان'));
        if (hasAnyValue && !normalized.date) missingRequired.push(tx(language, 'date', 'date', 'التاريخ'));
        if (hasAnyValue && !normalized.note) missingRequired.push(tx(language, 'note', 'note', 'الملاحظة'));
        return {
          hasAnyValue,
          missingRequired,
          isIncomplete: hasAnyValue && missingRequired.length > 0,
        };
      }),
    [fixtureEvents, language]
  );

  const hasInvalidFixtureEvents = useMemo(
    () => fixtureEventValidation.some((event) => event.isIncomplete),
    [fixtureEventValidation]
  );

  const pendingRegistrations = useMemo(() => registrations.filter((r) => r.status === 'pending'), [registrations]);

  if (!authed) return <div className="py-20 text-center text-[var(--text-muted)]">{tx(language, 'Vérification de l’authentification...', 'Checking auth...', 'جارٍ التحقق من المصادقة...')}</div>;

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-[var(--accent-red)]" />
          <div>
            <h1 className="font-display text-2xl">{tx(language, 'Tableau de bord admin', 'Admin Dashboard', 'لوحة تحكم الإدارة')}</h1>
            <p className="text-sm text-[var(--text-muted)]">{tx(language, 'Gérez les joueurs, matchs, clubs et paramètres du tournoi depuis un seul panneau.', 'Manage players, matches, clubs, and tournament settings from one control panel.', 'إدارة اللاعبين والمباريات والأندية وإعدادات البطولة من لوحة واحدة.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]">
            <RefreshCw size={16} />
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
            <LogOut size={14} /> {tx(language, 'Déconnexion', 'Logout', 'تسجيل الخروج')}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${msg.toLowerCase().includes('error') ? 'border border-red-500/30 bg-red-500/10 text-red-400' : 'border border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {msg}
        </div>
      )}

      <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-[var(--bg-secondary)] p-1">
        {[
          { key: 'players' as const, label: tx(language, 'Joueurs', 'Players', 'اللاعبون'), icon: Users },
          { key: 'registrations' as const, label: `${tx(language, 'Inscriptions', 'Registrations', 'التسجيلات')} ${pendingRegistrations.length > 0 ? `(${pendingRegistrations.length})` : ''}`, icon: UserCheck },
          { key: 'matches' as const, label: tx(language, 'Matchs', 'Matches', 'المباريات'), icon: Swords },
          { key: 'clubs' as const, label: tx(language, 'Clubs', 'Clubs', 'الأندية'), icon: Building2 },
          { key: 'settings' as const, label: tx(language, 'Paramètres', 'Settings', 'الإعدادات'), icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => resetForms(key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors ${tab === key ? 'bg-[var(--bg-card)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-lg">{editing ? tx(language, 'Modifier joueur', 'Edit Player', 'تعديل لاعب') : tx(language, 'Ajouter joueur', 'Add Player', 'إضافة لاعب')}</h2>
                {!editing && <p className="mt-1 text-xs text-[var(--text-muted)]">{tx(language, 'Les contrôles du tirage sont réservés à l’admin.', 'Draw controls are admin-only.', 'عناصر التحكم في القرعة مخصصة للإدارة فقط.')}</p>}
              </div>
              {!editing && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
                  <input 
                    value={groupNames} 
                    onChange={(e) => setGroupNames(e.target.value)}
                    placeholder={tx(language, 'Groupe A, Groupe B, ... Groupe T', 'Group A, Group B, ... Group T', 'المجموعة A، المجموعة B ... المجموعة T')}
                    className="w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs focus:border-[var(--accent-red)] focus:outline-none"
                  />
                  <button 
                    onClick={runDraw}
                    disabled={loading || players.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,194,71,0.18)] bg-[rgba(255,194,71,0.12)] px-3 py-2 text-xs font-bold text-[var(--accent-gold)] transition-all hover:bg-[rgba(255,194,71,0.16)] disabled:opacity-40"
                  >
                    <Shuffle size={12} /> {tx(language, 'Tirage admin', 'Admin draw', 'سحب الإدارة')}
                  </button>
                </div>
              )}
            </div>
            {!editing && (
              <div className="mb-4 rounded-xl border border-[rgba(255,194,71,0.14)] bg-[rgba(255,194,71,0.06)] px-3 py-2 text-xs text-[var(--text-muted)]">
                {tx(language, 'Seul l\'admin peut modifier les groupes à tout moment (bouton Groupe) et activer/désactiver la tête de série (bouton Classer/Retirer), puis lancer le tirage équilibré.', 'Only admin can modify groups at any time (Group button) and enable/disable seeded status (Seed/Unseed button), then launch the balanced draw.', 'فقط الإدارة يمكنها تعديل المجموعات في أي وقت (زر المجموعة) وتفعيل/إلغاء التصنيف (زر تصنيف/إلغاء)، ثم تشغيل السحب المتوازن.')}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-4">
              {([
                ['id', tx(language, 'ID (unique)', 'ID (unique)', 'المعرف (فريد)'), 'text', editing !== null],
                ['name', tx(language, 'Nom complet', 'Full Name', 'الاسم الكامل'), 'text', false],
                ['nickname', tx(language, 'Surnom', 'Nickname', 'اللقب'), 'text', false],
                ['nationality', tx(language, 'Nationalité', 'Nationality', 'الجنسية'), 'text', false],
                ['age', tx(language, 'Âge', 'Age', 'العمر'), 'number', false],
                ['club', tx(language, 'Club', 'Club', 'النادي'), 'text', false],
                ['pool_group', tx(language, 'Groupe', 'Group', 'المجموعة'), 'text', false],
                ['photo_url', tx(language, 'URL photo', 'Photo URL', 'رابط الصورة'), 'text', false],
              ] as const).map(([key, label, type, disabled]) => (
                <div key={key} className={key === 'photo_url' ? 'md:col-span-2' : ''}>
                  <label className="mb-1 block text-xs font-mono uppercase text-[var(--text-muted)]">{label}</label>
                  <input
                    type={type}
                    value={playerForm[key]}
                    onChange={(e) => setPlayerForm((p) => ({ ...p, [key]: e.target.value }))}
                    disabled={disabled as boolean}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={savePlayer}
                disabled={loading || !playerForm.id || !playerForm.name}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-red)] px-5 py-2 font-mono text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
              >
                <Save size={14} /> {editing ? tx(language, 'Mettre à jour', 'Update', 'تحديث') : tx(language, 'Ajouter', 'Add', 'إضافة')}
              </button>
              {editing && (
                <button onClick={() => { setEditing(null); setPlayerForm(emptyPlayer); }} className="rounded-lg px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">
                  {tx(language, 'Annuler', 'Cancel', 'إلغاء')}
                </button>
              )}
              {editing && (
                <button onClick={deletePlayer} className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 size={14} /> {tx(language, 'Supprimer', 'Delete', 'حذف')}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="font-display text-lg">{tx(language, 'Effectif des joueurs', 'Player roster', 'قائمة اللاعبين')}</h3>
              <input
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                placeholder={tx(language, 'Rechercher par nom, club, ID, groupe', 'Search by name, club, ID, group', 'ابحث بالاسم أو النادي أو المعرف أو المجموعة')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none md:max-w-xs"
              />
            </div>

            {selectedPlayerIds.size > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 p-3">
                <span className="text-sm font-mono text-[var(--text-secondary)]">{selectedPlayerIds.size} {tx(language, 'sélectionné(s)', 'selected', 'تم اختيارهم')}</span>
                <button onClick={bulkSeedPlayers} disabled={loading} className="text-xs rounded px-2 py-1 bg-[rgba(255,194,71,0.12)] text-[var(--accent-gold)] hover:bg-[rgba(255,194,71,0.18)] disabled:opacity-40">{tx(language, 'Classer', 'Seed all', 'تصنيف الكل')}</button>
                <button onClick={bulkUnseedPlayers} disabled={loading} className="text-xs rounded px-2 py-1 bg-[rgba(255,194,71,0.12)] text-[var(--accent-gold)] hover:bg-[rgba(255,194,71,0.18)] disabled:opacity-40">{tx(language, 'Retirer', 'Unseed all', 'إلغاء الكل')}</button>
                <button onClick={bulkDeletePlayers} disabled={loading} className="text-xs rounded px-2 py-1 bg-red-500/12 text-red-400 hover:bg-red-500/18 disabled:opacity-40">{tx(language, 'Supprimer', 'Delete all', 'حذف الكل')}</button>
                <button onClick={() => setSelectedPlayerIds(new Set())} className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full standings-table">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th style={{width: '32px'}}>
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.size === filteredPlayers.length && filteredPlayers.length > 0}
                        onChange={selectAllFilteredPlayers}
                        className="cursor-pointer"
                      />
                    </th>
                    <th>ID</th><th>{tx(language, 'Nom', 'Name', 'الاسم')}</th><th>{tx(language, 'Club', 'Club', 'النادي')}</th><th>{tx(language, 'Groupe', 'Group', 'المجموعة')}</th><th>{tx(language, 'Tête', 'Seed', 'تصنيف')}</th><th>{tx(language, 'Nationalité', 'Nationality', 'الجنسية')}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p) => (
                    <tr key={p.id}>
                      <td style={{width: '32px'}}>
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.has(p.id)}
                          onChange={() => togglePlayerSelection(p.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="font-mono text-xs">{p.id}</td>
                      <td className="text-sm font-medium">{p.name}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{p.club || '—'}</td>
                      <td className="font-mono text-xs">{p.pool_group || '—'}</td>
                      <td>
                        <span className={`rounded px-2 py-0.5 font-mono text-[10px] ${p.is_seeded === 'true' ? 'bg-[rgba(255,194,71,0.16)] text-[var(--accent-gold)]' : 'bg-white/10 text-white/60'}`}>
                          {p.is_seeded === 'true' ? tx(language, 'TÊTE', 'SEEDED', 'مصنف') : tx(language, 'NON', 'OFF', 'غير مفعل')}
                        </span>
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">{p.nationality || '—'}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <button onClick={() => assignGroup(p)} className="text-xs text-[var(--accent-blue)] hover:underline">{tx(language, 'Groupe', 'Group', 'مجموعة')}</button>
                          <button onClick={() => toggleSeedPlayer(p)} className="text-xs text-[var(--accent-gold)] hover:underline">{p.is_seeded === 'true' ? tx(language, 'Retirer tête', 'Unseed', 'إلغاء التصنيف') : tx(language, 'Classer tête', 'Seed', 'تصنيف')}</button>
                          <button onClick={() => editPlayer(p)} className="text-xs text-[var(--accent-blue)] hover:underline">{tx(language, 'Modifier', 'Edit', 'تعديل')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        {tx(language, 'Aucun joueur pour le moment. Utilisez le formulaire ci-dessus pour ajouter votre premier inscrit.', 'No players yet. Use the form above to add your first registration.', 'لا يوجد لاعبون بعد. استخدم النموذج أعلاه لإضافة أول تسجيل.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'registrations' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="font-display text-lg mb-4">{tx(language, 'Inscriptions en attente', 'Pending registrations', 'التسجيلات المعلقة')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full standings-table">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th>{tx(language, 'Nom', 'Name', 'الاسم')}</th><th>{tx(language, 'Contact', 'Contact', 'الاتصال')}</th><th>{tx(language, 'Origine', 'Origin', 'الأصل')}</th><th>{tx(language, 'Âge / CIN', 'Age / CIN', 'العمر / رقم التعريف')}</th><th>{tx(language, 'Statut', 'Status', 'الحالة')}</th><th>{tx(language, 'Actions', 'Actions', 'الإجراءات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td className="text-sm font-medium">
                        {r.name}
                        {r.nickname && <span className="ml-2 text-xs text-[var(--text-muted)]">&quot;{r.nickname}&quot;</span>}
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">
                        <div>{r.email}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.phone}</div>
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">
                        <div>{r.city}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.nationality}</div>
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">
                        <div>{r.age ?? '—'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.cin || tx(language, 'CIN non requis', 'CIN not required', 'CIN غير مطلوب')}</div>
                      </td>
                      <td>
                        <span className={`rounded px-2 py-0.5 font-mono text-[10px] ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : r.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleRegistration(r.id, 'approved')} className="text-xs text-green-400 hover:underline">{tx(language, 'Approuver', 'Approve', 'موافقة')}</button>
                            <button onClick={() => handleRegistration(r.id, 'rejected')} className="text-xs text-red-400 hover:underline">{tx(language, 'Refuser', 'Reject', 'رفض')}</button>
                          </div>
                        )}
                        {r.status !== 'pending' && <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td>
                        <button onClick={() => deleteRegistration(r.id)} className="text-xs text-red-400 hover:underline">{tx(language, 'Supprimer', 'Delete', 'حذف')}</button>
                      </td>
                    </tr>
                  ))}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        {tx(language, 'Aucune inscription trouvée. Partagez le lien /register avec les joueurs !', 'No registrations found. Share the /register link with players!', 'لم يتم العثور على تسجيلات. شارك رابط /register مع اللاعبين!')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'clubs' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 font-display text-lg">{editing ? tx(language, 'Modifier club', 'Edit Club', 'تعديل النادي') : tx(language, 'Ajouter club', 'Add Club', 'إضافة نادي')}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label={tx(language, 'ID', 'ID', 'المعرف')}>
                <input value={clubForm.id} onChange={(e) => setClubForm((c) => ({ ...c, id: e.target.value }))} disabled={editing !== null} className="admin-input" placeholder="club-id" />
              </Field>
              <Field label={tx(language, 'Nom', 'Name', 'الاسم')}>
                <input value={clubForm.name} onChange={(e) => setClubForm((c) => ({ ...c, name: e.target.value }))} className="admin-input" placeholder={tx(language, 'Nom du club', 'Club Name', 'اسم النادي')} />
              </Field>
              <Field label={tx(language, 'Ville', 'City', 'المدينة')}>
                <input value={clubForm.city} onChange={(e) => setClubForm((c) => ({ ...c, city: e.target.value }))} className="admin-input" placeholder={tx(language, 'Tunis', 'Tunis', 'تونس')} />
              </Field>
              <Field label={tx(language, 'URL logo', 'Logo URL', 'رابط الشعار')}>
                <input value={clubForm.logo_url} onChange={(e) => setClubForm((c) => ({ ...c, logo_url: e.target.value }))} className="admin-input" placeholder="https://..." />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={saveClub} disabled={loading || !clubForm.id || !clubForm.name} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-red)] px-5 py-2 font-mono text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-40">
                <Save size={14} /> {editing ? tx(language, 'Mettre à jour', 'Update', 'تحديث') : tx(language, 'Ajouter', 'Add', 'إضافة')}
              </button>
              {editing && <button onClick={() => { setEditing(null); setClubForm(emptyClub); }} className="rounded-lg px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">{tx(language, 'Annuler', 'Cancel', 'إلغاء')}</button>}
              {editing && <button onClick={deleteClub} className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /> {tx(language, 'Supprimer', 'Delete', 'حذف')}</button>}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="font-display text-lg">{tx(language, 'Répertoire des clubs', 'Club directory', 'دليل الأندية')}</h3>
              <input
                value={clubQuery}
                onChange={(e) => setClubQuery(e.target.value)}
                placeholder={tx(language, 'Rechercher par nom, ville, ID', 'Search by club name, city, ID', 'ابحث باسم النادي أو المدينة أو المعرف')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none md:max-w-xs"
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full standings-table">
                <thead><tr className="bg-[var(--bg-secondary)]"><th>ID</th><th>{tx(language, 'Nom', 'Name', 'الاسم')}</th><th>{tx(language, 'Ville', 'City', 'المدينة')}</th><th></th></tr></thead>
                <tbody>
                  {filteredClubs.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs">{c.id}</td>
                      <td className="text-sm font-medium">{c.name}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{c.city || '—'}</td>
                      <td><button onClick={() => editClub(c)} className="text-xs text-[var(--accent-blue)] hover:underline">{tx(language, 'Modifier', 'Edit', 'تعديل')}</button></td>
                    </tr>
                  ))}
                  {filteredClubs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        {tx(language, 'Aucun club pour le moment. Ajoutez des clubs maintenant ou laissez vide pour plus tard.', 'No clubs yet. Add clubs now, or leave this empty and fill it later.', 'لا توجد أندية حتى الآن. أضف الأندية الآن أو اتركها لاحقًا.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 font-display text-lg">{editing ? tx(language, 'Modifier match', 'Edit Match', 'تعديل مباراة') : tx(language, 'Ajouter match', 'Add Match', 'إضافة مباراة')}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="ID"><input value={matchForm.id} onChange={(e) => setMatchForm((m) => ({ ...m, id: e.target.value }))} disabled={editing !== null} className="admin-input" /></Field>
              <Field label={tx(language, 'Tour', 'Round', 'الدور')}><input value={matchForm.round} onChange={(e) => setMatchForm((m) => ({ ...m, round: e.target.value }))} className="admin-input" placeholder={tx(language, 'Tour 1', 'Round 1', 'الدور 1')} /></Field>
              <Field label={tx(language, 'Date', 'Date', 'التاريخ')}><input type="date" value={matchForm.date} onChange={(e) => setMatchForm((m) => ({ ...m, date: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Heure', 'Time', 'الوقت')}><input type="time" value={matchForm.time} onChange={(e) => setMatchForm((m) => ({ ...m, time: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Joueur 1', 'Player 1', 'اللاعب 1')}><select value={matchForm.player1_id} onChange={(e) => setMatchForm((m) => ({ ...m, player1_id: e.target.value }))} className="admin-input"><option value="">{tx(language, 'Sélectionner...', 'Select...', 'اختر...')}</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label={tx(language, 'Joueur 2', 'Player 2', 'اللاعب 2')}><select value={matchForm.player2_id} onChange={(e) => setMatchForm((m) => ({ ...m, player2_id: e.target.value }))} className="admin-input"><option value="">{tx(language, 'Sélectionner...', 'Select...', 'اختر...')}</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label={tx(language, 'Score 1', 'Score 1', 'النتيجة 1')}><input type="number" value={matchForm.score1} onChange={(e) => setMatchForm((m) => ({ ...m, score1: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Score 2', 'Score 2', 'النتيجة 2')}><input type="number" value={matchForm.score2} onChange={(e) => setMatchForm((m) => ({ ...m, score2: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Statut', 'Status', 'الحالة')}><select value={matchForm.status} onChange={(e) => setMatchForm((m) => ({ ...m, status: e.target.value }))} className="admin-input"><option value="scheduled">{tx(language, 'Programmé', 'Scheduled', 'مجدولة')}</option><option value="live">{tx(language, 'Direct', 'Live', 'مباشر')}</option><option value="completed">{tx(language, 'Terminé', 'Completed', 'منتهية')}</option><option value="postponed">{tx(language, 'Reporté', 'Postponed', 'مؤجلة')}</option></select></Field>
              <Field label={tx(language, 'Discipline', 'Discipline', 'التخصص')}><select value={matchForm.discipline} onChange={(e) => setMatchForm((m) => ({ ...m, discipline: e.target.value }))} className="admin-input"><option value="">{tx(language, 'Sélection libre...', 'Any select...', 'اختيار مفتوح...')}</option><option value="8-ball">8-ball</option><option value="9-ball">9-ball</option><option value="10-ball">10-ball</option></select></Field>
              <Field label={tx(language, 'Lieu', 'Venue', 'المكان')}>
                <select value={matchForm.venue} onChange={(e) => setMatchForm((m) => ({ ...m, venue: e.target.value }))} className="admin-input">
                  <option value="">{tx(language, 'Sélectionner une salle...', 'Select venue...', 'اختر المكان...')}</option>
                  {matchForm.venue && !venueOptions.includes(matchForm.venue) && <option value={matchForm.venue}>{matchForm.venue}</option>}
                  {venueOptions.map((venue) => <option key={venue} value={venue}>{venue}</option>)}
                </select>
              </Field>
              <Field label={tx(language, 'Notes', 'Notes', 'ملاحظات')}><input value={matchForm.notes} onChange={(e) => setMatchForm((m) => ({ ...m, notes: e.target.value }))} className="admin-input" /></Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={saveMatch} disabled={loading || !matchForm.id || !matchForm.player1_id || !matchForm.player2_id} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-red)] px-5 py-2 font-mono text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-40">
                <Save size={14} /> {editing ? tx(language, 'Mettre à jour', 'Update', 'تحديث') : tx(language, 'Ajouter', 'Add', 'إضافة')}
              </button>
              {editing && <button onClick={() => { setEditing(null); setMatchForm(emptyMatch); }} className="rounded-lg px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">{tx(language, 'Annuler', 'Cancel', 'إلغاء')}</button>}
              {editing && <button onClick={() => deleteMatch(editing)} className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /> {tx(language, 'Supprimer', 'Delete', 'حذف')}</button>}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="font-display text-lg">{tx(language, 'Liste des matchs', 'Match list', 'قائمة المباريات')}</h3>
              <input
                value={matchQuery}
                onChange={(e) => setMatchQuery(e.target.value)}
                placeholder={tx(language, 'Rechercher par tour, date, joueur, statut', 'Search by round, date, player, status', 'ابحث بالدور أو التاريخ أو اللاعب أو الحالة')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:border-[var(--accent-red)] focus:outline-none md:max-w-xs"
              />
            </div>

            {selectedMatchIds.size > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <span className="text-sm font-mono text-[var(--text-secondary)]">{selectedMatchIds.size} {tx(language, 'sélectionné(s)', 'selected', 'تم اختيارهم')}</span>
                <button onClick={bulkDeleteMatches} disabled={loading} className="text-xs rounded px-2 py-1 bg-red-500/12 text-red-400 hover:bg-red-500/18 disabled:opacity-40">{tx(language, 'Supprimer', 'Delete all', 'حذف الكل')}</button>
                <button onClick={() => setSelectedMatchIds(new Set())} className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full standings-table">
                <thead><tr className="bg-[var(--bg-secondary)]">
                  <th style={{width: '32px'}}>
                    <input
                      type="checkbox"
                      checked={selectedMatchIds.size === filteredMatches.length && filteredMatches.length > 0}
                      onChange={selectAllFilteredMatches}
                      className="cursor-pointer"
                    />
                  </th>
                  <th>ID</th><th>{tx(language, 'Tour', 'Round', 'الدور')}</th><th>{tx(language, 'Date', 'Date', 'التاريخ')}</th><th>{tx(language, 'Heure', 'Time', 'الوقت')}</th><th>{tx(language, 'Salle', 'Venue', 'المكان')}</th><th>{tx(language, 'Joueur 1', 'Player 1', 'اللاعب 1')}</th><th>{tx(language, 'Score', 'Score', 'النتيجة')}</th><th>{tx(language, 'Joueur 2', 'Player 2', 'اللاعب 2')}</th><th>{tx(language, 'Statut', 'Status', 'الحالة')}</th><th></th></tr></thead>
                <tbody>
                  {filteredMatches.map((m) => {
                    const p1Name = players.find((p) => p.id === m.player1_id)?.name || m.player1_id;
                    const p2Name = players.find((p) => p.id === m.player2_id)?.name || m.player2_id;
                    const inline = matchScheduleEdits[m.id] || { date: m.date, time: m.time, venue: m.venue };
                    return (
                      <tr key={m.id}>
                        <td style={{width: '32px'}}>
                          <input
                            type="checkbox"
                            checked={selectedMatchIds.has(m.id)}
                            onChange={() => toggleMatchSelection(m.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="font-mono text-xs">{m.id}</td>
                        <td className="text-sm">{m.round}</td>
                        <td className="font-mono text-xs">
                          <input
                            type="date"
                            value={inline.date}
                            onChange={(e) => setMatchScheduleEdits((prev) => ({
                              ...prev,
                              [m.id]: { ...inline, date: e.target.value },
                            }))}
                            className="w-32 rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="font-mono text-xs">
                          <input
                            type="time"
                            value={inline.time}
                            onChange={(e) => setMatchScheduleEdits((prev) => ({
                              ...prev,
                              [m.id]: { ...inline, time: e.target.value },
                            }))}
                            className="w-24 rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="font-mono text-xs">
                          <select
                            value={inline.venue}
                            onChange={(e) => setMatchScheduleEdits((prev) => ({
                              ...prev,
                              [m.id]: { ...inline, venue: e.target.value },
                            }))}
                            className="w-32 rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs"
                          >
                            <option value="">{tx(language, 'Salle', 'Venue', 'المكان')}</option>
                            {inline.venue && !venueOptions.includes(inline.venue) && <option value={inline.venue}>{inline.venue}</option>}
                            {venueOptions.map((venue) => <option key={`${m.id}-${venue}`} value={venue}>{venue}</option>)}
                          </select>
                        </td>
                        <td className="text-sm font-medium">{p1Name}</td>
                        <td className="text-center font-mono text-sm">{m.score1 || '-'} : {m.score2 || '-'}</td>
                        <td className="text-sm font-medium">{p2Name}</td>
                        <td><span className={`rounded px-2 py-0.5 font-mono text-[10px] ${m.status === 'completed' ? 'bg-green-500/20 text-green-400' : m.status === 'live' ? 'bg-red-500/20 text-red-400' : m.status === 'postponed' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{m.status.toUpperCase()}</span></td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => saveMatchScheduleInline(m.id)} className="text-xs text-green-400 hover:underline">{tx(language, 'Date/Heure/Salle', 'Save schedule', 'حفظ الجدولة')}</button>
                            <button onClick={() => editMatch(m)} className="text-xs text-[var(--accent-blue)] hover:underline">{tx(language, 'Modifier', 'Edit', 'تعديل')}</button>
                            <button onClick={() => deleteMatch(m.id)} className="text-xs text-red-400 hover:underline">{tx(language, 'Supprimer', 'Delete', 'حذف')}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMatches.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        {tx(language, 'Aucun match planifié pour le moment. Créez votre première affiche via le formulaire ci-dessus.', 'No matches scheduled yet. Create your first fixture from the form above.', 'لا توجد مباريات مجدولة حتى الآن. أنشئ أول مباراة من النموذج أعلاه.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 font-display text-lg">{tx(language, 'Paramètres du tournoi', 'Tournament settings', 'إعدادات البطولة')}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={tx(language, 'Nom du tournoi', 'Tournament name', 'اسم البطولة')}><input value={settingsForm.name} onChange={(e) => setSettingsForm((s) => ({ ...s, name: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Saison', 'Season', 'الموسم')}><input value={settingsForm.season} onChange={(e) => setSettingsForm((s) => ({ ...s, season: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Points victoire', 'Points for win', 'نقاط الفوز')}><input type="number" value={settingsForm.pointsWin} onChange={(e) => setSettingsForm((s) => ({ ...s, pointsWin: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Points défaite', 'Points for loss', 'نقاط الخسارة')}><input type="number" value={settingsForm.pointsLoss} onChange={(e) => setSettingsForm((s) => ({ ...s, pointsLoss: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'URL logo', 'Logo URL', 'رابط الشعار')}><input value={settingsForm.logo} onChange={(e) => setSettingsForm((s) => ({ ...s, logo: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Titre hero', 'Hero title', 'عنوان الواجهة')}><input value={settingsForm.heroTitle} onChange={(e) => setSettingsForm((s) => ({ ...s, heroTitle: e.target.value }))} className="admin-input" /></Field>
              <Field label={tx(language, 'Sous-titre hero', 'Hero subtitle', 'العنوان الفرعي')}><input value={settingsForm.heroSubtitle} onChange={(e) => setSettingsForm((s) => ({ ...s, heroSubtitle: e.target.value }))} className="admin-input" /></Field>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label={tx(language, 'Upcoming events (CRUD)', 'Upcoming events (CRUD)', 'الفعاليات القادمة (إضافة/تعديل/حذف)')}>
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                  {fixtureEvents.map((event, index) => {
                    const validation = fixtureEventValidation[index];
                    const eventVenues = event.venue && !venueOptions.includes(event.venue) ? [event.venue, ...venueOptions] : venueOptions;
                    return (
                    <div key={`${event.id}-${index}`} className={`grid gap-2 rounded-lg border p-2 md:grid-cols-5 ${validation?.isIncomplete ? 'border-red-500/40 bg-red-500/5' : 'border-[var(--border)] bg-[var(--bg-card)]'}`}>
                      <input
                        value={event.id}
                        onChange={(e) => updateFixtureEvent(index, { id: e.target.value })}
                        className="admin-input"
                        placeholder="event-id"
                      />
                      <input
                        value={event.title}
                        onChange={(e) => updateFixtureEvent(index, { title: e.target.value })}
                        className="admin-input"
                        placeholder={tx(language, 'Titre', 'Title', 'العنوان')}
                      />
                      <input
                        value={event.date}
                        onChange={(e) => updateFixtureEvent(index, { date: e.target.value })}
                        className="admin-input"
                        placeholder={tx(language, 'Date affichée', 'Display date', 'تاريخ العرض')}
                      />
                      <input
                        value={event.note}
                        onChange={(e) => updateFixtureEvent(index, { note: e.target.value })}
                        className="admin-input"
                        placeholder={tx(language, 'Note', 'Note', 'ملاحظة')}
                      />
                      <div className="flex gap-2">
                        <select
                          value={event.venue}
                          onChange={(e) => updateFixtureEvent(index, { venue: e.target.value })}
                          className="admin-input"
                        >
                          <option value="">{tx(language, 'Salle (optionnel)', 'Venue (optional)', 'المكان (اختياري)')}</option>
                          {eventVenues.map((venue) => <option key={`${index}-${venue}`} value={venue}>{venue}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFixtureEvent(index)}
                          className="rounded-md px-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          {tx(language, 'Suppr.', 'Delete', 'حذف')}
                        </button>
                      </div>
                      {validation?.isIncomplete && (
                        <div className="md:col-span-5 text-[11px] text-red-400">
                          {tx(language, 'Événement incomplet: champs requis manquants', 'Incomplete event: missing required fields', 'فعالية غير مكتملة: حقول مطلوبة ناقصة')} ({validation.missingRequired.join(', ')})
                        </div>
                      )}
                    </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addFixtureEvent}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  >
                    {tx(language, 'Ajouter un événement', 'Add event', 'إضافة فعالية')}
                  </button>
                </div>
              </Field>
              <Field label={tx(language, 'Venues du tournoi (1 ligne = 1 venue)', 'Tournament venues (1 line = 1 venue)', 'أماكن البطولة (سطر واحد = مكان واحد)')}>
                <textarea
                  value={settingsForm.venuesText}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, venuesText: e.target.value }))}
                  className="admin-input min-h-[140px]"
                  placeholder={tx(language, 'Salle 1\nSalle 2\nClub Central', 'Hall 1\nHall 2\nMain Club', 'القاعة 1\nالقاعة 2\nالنادي الرئيسي')}
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {tx(language, 'Ajoutez/modifiez/supprimez des événements puis enregistrez. Les venues restent en 1 ligne par salle.', 'Add/edit/delete events then save. Venues remain one per line.', 'أضف/عدّل/احذف الفعاليات ثم احفظ. الأماكن تبقى سطرًا واحدًا لكل مكان.')}
            </p>
            {hasInvalidFixtureEvents && (
              <p className="mt-2 text-xs text-red-400">
                {tx(language, 'Certaines lignes d’événements sont incomplètes et doivent être corrigées avant la sauvegarde.', 'Some event rows are incomplete and must be fixed before saving.', 'بعض أسطر الفعاليات غير مكتملة ويجب إصلاحها قبل الحفظ.')}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={saveSettings} disabled={loading || !settingsForm.name || !settingsForm.season} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-red)] px-5 py-2 font-mono text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-40">
                <Save size={14} /> {tx(language, 'Enregistrer', 'Save settings', 'حفظ الإعدادات')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-mono uppercase text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
