export type Language = 'fr' | 'en' | 'ar';

export const LANGUAGE_COOKIE = 'pool-lang';
export const DEFAULT_LANGUAGE: Language = 'fr';

const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

const DIRECTIONS: Record<Language, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};

const translations = {
  fr: {
    nav: {
      brandTagline: 'Sport de billard tunisien',
      overview: 'Aperçu',
      draw: 'Tirage',
      schedule: 'Programme',
      results: 'Résultats',
      players: 'Joueurs',
      registration: 'Inscription',
      arenaHud: 'HUD arène',
    },
    footer: {
      rights: '© 2024 Tunisian Pool Championship. Tous droits réservés.',
      tagline: 'Classements, programme, résultats et direct réunis dans un espace premium.',
    },
    home: {
      dataUnavailableTitle: 'Espace tournoi',
      dataUnavailableBody:
        'Les données du tournoi en direct ne sont pas encore disponibles. Ajoutez des joueurs et des matchs depuis le tableau de bord administrateur ou vérifiez la connexion MongoDB en production.',
      dataUnavailableAction: '/admin/dashboard',
      seasonKicker: (season: string, country: string) => `${season} saison · ${country}`,
      heroTitle: 'Championnat tunisien de billard 2026',
      heroSubtitle:
        'réunit les meilleurs talents du billard tunisien pour une compétition intense, élégante et pleine de passion. Vivez l’émotion du jeu, soutenez vos champions et découvrez un événement où chaque coup compte.',
      leader: 'Leader',
      competition: 'Compétition',
      progress: 'Progression',
      playersCount: (count: number) => `${count} joueurs`,
      matchesCompleted: (completed: number, total: number) => `${completed}/${total} matchs terminés`,
      quickSnapshot: 'Aperçu rapide',
      tournamentPulse: 'Pouls du tournoi',
      liveReady: 'Prêt pour le direct',
      playersRegistered: 'Joueurs inscrits',
      matchesCompletedLabel: 'Matchs terminés',
      nextFixturesLoaded: 'Prochains matchs chargés',
      professionalDirection: 'Direction professionnelle',
      professionalText:
        'Un espace de tournoi pensé pour les organisateurs, l’équipe technique et les fans, avec une lecture claire des données.',
      leaderboard: 'Classement',
      standings: 'Classement',
      viewAllPlayers: 'Voir tous les joueurs',
      tableHeadings: {
        rank: '#',
        player: 'Joueur',
        played: 'J',
        wins: 'V',
        losses: 'D',
        frameDiff: 'Diff',
        points: 'Pts',
        form: 'Forme',
      },
      upcoming: 'À venir',
      scheduleFocus: 'Focus calendrier',
      fullSchedule: 'Programme complet',
      noUpcomingFixtures: 'Aucun prochain match chargé pour le moment.',
      completed: 'Terminés',
      latestResults: 'Derniers résultats',
      resultsCentre: 'Centre des résultats',
      noCompletedMatches: 'Aucun match terminé pour le moment.',
      status: {
        scheduled: 'Prévu',
        live: 'En direct',
        postponed: 'Reporté',
        completed: 'Terminé',
      },
    },
    draw: {
      seasonKicker: (season: string) => `${season} structure du tournoi`,
      title: 'Tirage & Poules',
      subtitle:
        'Explorez le tirage officiel du Tunisian Pool Championship 2026, avec l&apos;allocation des groupes, les têtes de série et la structure du tournoi dès le début de la compétition.',
      officialParagraph:
        'Les joueurs sont répartis dans leurs poules selon leur classement. Les têtes de série sont placées en premier, puis les autres joueurs sont distribués aléatoirement pour garantir des groupes équilibrés dès le coup d\'envoi.',
      readOnly: 'Lecture seule',
      adminManaged: 'Géré par l&apos;admin',
      balancedPools: 'Poules équilibrées',
      pools: 'Poules',
      players: 'Joueurs',
      balance: 'Équilibre',
      status: 'Statut',
      poolsCreated: 'Groupes créés pour le tirage actuel',
      registeredPlayers: 'Joueurs inscrits dans la compétition',
      groupSizeRange: 'Fourchette de taille des groupes',
      automaticBalance: 'Équilibrage automatique après les groupes têtes de série',
      seededFirst: 'Têtes de série',
      seededFirstText:
        'Le premier joueur de chaque poule est traité comme tête de série et porte le badge Seed.',
      balancedAllocation: 'Répartition équilibrée',
      balancedAllocationText:
        'Les joueurs restants sont répartis aléatoirement en gardant des groupes aussi équilibrés que possible.',
      readOnlyText:
        'Les utilisateurs peuvent seulement consulter le tirage. Seul l&apos;admin peut définir les têtes de série et lancer le tirage depuis le tableau de bord.',
      noGroupsAssigned: 'Aucune poule attribuée pour le moment.',
      pool: 'Poule',
      playersInGroup: (count: number) => `${count} joueurs`,
      seed: 'Tête de série',
      points: 'Pts',
      even: 'Équilibré',
      mixed: 'Mixte',
    },
    fixtures: {
      seasonKicker: (season: string) => `${season} calendrier`,
      title: 'Programme',
      subtitle:
        'Parcourez le programme officiel du Tunisian Pool Championship 2026, incluant les matchs à venir, les horaires des tables et les détails clés pour suivre la compétition à chaque étape.',
      fixturesCount: (count: number) => `${count} rencontres`,
      upcomingEvents: 'Événements à venir',
      event: 'Événement',
      venue: 'Lieu',
      matchCard: 'Fiche de match',
      noUpcomingFixtures: 'Aucun prochain match programmé pour le moment.',
      roundLabel: 'Tour',
      eventOneTitle: 'Phases de poule',
      eventOneDate: '1 Mai',
      eventOneNote: 'Ouverture des poules et lancement de la phase de groupes.',
      eventTwoTitle: 'Coupe Tunisie',
      eventTwoDate: 'À venir',
      eventTwoNote: 'Compétition additionnelle visible dans le programme.',
    },
    players: {
      kicker: 'Espace joueurs',
      title: 'Joueurs',
      subtitle:
        'Fiches joueurs, contexte du classement et une présentation plus premium du répertoire du tournoi.',
      athletesCount: (count: number) => `${count} athlètes`,
      noPlayers: 'Aucun joueur inscrit pour le moment.',
      points: 'Pts',
      years: (age: number) => `${age} ans`,
      metrics: {
        played: 'J',
        wins: 'V',
        losses: 'D',
      },
    },
    playerDetail: {
      backToPlayers: 'Retour aux joueurs',
      frames: 'Cadres :',
      won: 'gagnés',
      lost: 'perdus',
      points: 'Points',
      played: 'Joués',
      wins: 'Victoires',
      losses: 'Défaites',
      winRate: 'Taux de victoire',
      matchHistory: 'Historique des matchs',
      vs: 'contre',
      noMatches: 'Aucun match enregistré.',
      statusCompleted: 'terminé',
      shortWin: 'V',
      shortLoss: 'D',
    },
    results: {
      kicker: 'Matchs terminés',
      title: 'Centre des résultats',
      subtitle:
        'Explorez les résultats officiels du Tunisian Pool Championship 2026, avec les scores finaux, l’historique des matchs et une vue claire des rencontres terminées tout au long de la compétition.',
      resultsCount: (count: number) => `${count} résultats`,
      noCompletedMatches: 'Aucun match terminé pour le moment.',
      final: 'final',
    },
  },
  en: {
    nav: {
      brandTagline: 'Tunisian cue sports',
      overview: 'Overview',
      draw: 'Draw',
      schedule: 'Schedule',
      results: 'Results',
      players: 'Players',
      registration: 'Registration',
      arenaHud: 'Arena HUD',
    },
    footer: {
      rights: '© 2024 Tunisian Pool Championship. All rights reserved.',
      tagline: 'Standings, schedule, results and live control in one premium tournament space.',
    },
    home: {
      dataUnavailableTitle: 'Tournament workspace',
      dataUnavailableBody:
        'Live tournament data is not available yet. Add players and matches from the admin dashboard or verify your MongoDB connection for production.',
      dataUnavailableAction: '/admin/dashboard',
      seasonKicker: (season: string, country: string) => `${season} season · ${country}`,
      heroTitle: 'Tunisian Billiards Championship 2026',
      heroSubtitle:
        'Brings together the best Tunisian billiards talent for an intense, elegant competition full of passion. Feel the emotion of the game, support your champions, and discover an event where every shot counts.',
      leader: 'Leader',
      competition: 'Competition',
      progress: 'Progress',
      playersCount: (count: number) => `${count} players`,
      matchesCompleted: (completed: number, total: number) => `${completed}/${total} matches completed`,
      quickSnapshot: 'Quick snapshot',
      tournamentPulse: 'Tournament pulse',
      liveReady: 'Live-ready',
      playersRegistered: 'Players registered',
      matchesCompletedLabel: 'Matches completed',
      nextFixturesLoaded: 'Next fixtures loaded',
      professionalDirection: 'Professional direction',
      professionalText:
        'A focused tournament workspace built for operators, staff, and fans with clear data visibility.',
      leaderboard: 'Leaderboard',
      standings: 'Standings',
      viewAllPlayers: 'View all players',
      tableHeadings: {
        rank: '#',
        player: 'Player',
        played: 'P',
        wins: 'W',
        losses: 'L',
        frameDiff: 'FD',
        points: 'Pts',
        form: 'Form',
      },
      upcoming: 'Upcoming',
      scheduleFocus: 'Schedule focus',
      fullSchedule: 'Full schedule',
      noUpcomingFixtures: 'No upcoming fixtures loaded yet.',
      completed: 'Completed',
      latestResults: 'Latest results',
      resultsCentre: 'Results centre',
      noCompletedMatches: 'No completed matches yet.',
      status: {
        scheduled: 'Scheduled',
        live: 'Live',
        postponed: 'Postponed',
        completed: 'Completed',
      },
    },
    draw: {
      seasonKicker: (season: string) => `${season} tournament structure`,
      title: 'Draw & Pools',
      subtitle:
        'Explore the official draw of the Tunisian Pool Championship 2026, including player group allocation, seeded players, and the tournament structure from the moment the competition begins.',
      officialParagraph:
        'Players are distributed into their pools based on ranking. Seeded players are placed first, then the remaining players are randomly allocated to ensure balanced groups from the very first match.',
      readOnly: 'Read only',
      adminManaged: 'Admin managed',
      balancedPools: 'Balanced pools',
      pools: 'Pools',
      players: 'Players',
      balance: 'Balance',
      status: 'Status',
      poolsCreated: 'Groups created for the current draw',
      registeredPlayers: 'Registered players in the competition',
      groupSizeRange: 'Group size range',
      automaticBalance: 'Automatic balance after seeded groups',
      seededFirst: 'Seeded first',
      seededFirstText:
        'The first player in each pool is treated as the seeded head of group and appears with a Seed badge.',
      balancedAllocation: 'Balanced allocation',
      balancedAllocationText:
        'Remaining players are distributed randomly while keeping group sizes as even as possible.',
      readOnlyText:
        'Users can only view the draw. Only the admin can set seeds and launch the draw from the dashboard.',
      noGroupsAssigned: 'No groups assigned yet.',
      pool: 'Pool',
      playersInGroup: (count: number) => `${count} players`,
      seed: 'Seed',
      points: 'Pts',
      even: 'Even',
      mixed: 'Mixed',
    },
    fixtures: {
      seasonKicker: (season: string) => `${season} calendar`,
      title: 'Schedule',
      subtitle:
        'Browse the official schedule of the Tunisian Pool Championship 2026, including upcoming matches, table times, and key event details to follow the competition every step of the way.',
      fixturesCount: (count: number) => `${count} fixtures`,
      upcomingEvents: 'Upcoming events',
      event: 'Event',
      venue: 'Venue',
      matchCard: 'Match card',
      noUpcomingFixtures: 'No upcoming fixtures scheduled yet.',
      roundLabel: 'Round',
      eventOneTitle: 'Group stage',
      eventOneDate: '1 May',
      eventOneNote: 'Opening of the pools and start of the group phase.',
      eventTwoTitle: 'Tunisia Cup',
      eventTwoDate: 'Coming soon',
      eventTwoNote: 'Additional competition visible in the schedule.',
    },
    players: {
      kicker: 'Roster hub',
      title: 'Players',
      subtitle:
        'Player cards, ranking context, and a more premium tournament-directory feel.',
      athletesCount: (count: number) => `${count} athletes`,
      noPlayers: 'No players registered yet.',
      points: 'Pts',
      years: (age: number) => `${age} years`,
      metrics: {
        played: 'P',
        wins: 'W',
        losses: 'L',
      },
    },
    playerDetail: {
      backToPlayers: 'Back to Players',
      frames: 'Frames:',
      won: 'won',
      lost: 'lost',
      points: 'Points',
      played: 'Played',
      wins: 'Wins',
      losses: 'Losses',
      winRate: 'Win rate',
      matchHistory: 'Match History',
      vs: 'vs',
      noMatches: 'No matches recorded.',
      statusCompleted: 'completed',
      shortWin: 'W',
      shortLoss: 'L',
    },
    results: {
      kicker: 'Completed matches',
      title: 'Results Centre',
      subtitle:
        'Explore the official results of the Tunisian Pool Championship 2026, including final scores, match history, and a clear overview of completed fixtures throughout the competition.',
      resultsCount: (count: number) => `${count} results`,
      noCompletedMatches: 'No completed matches yet.',
      final: 'final',
    },
  },
  ar: {
    nav: {
      brandTagline: 'رياضة البلياردو التونسية',
      overview: 'نظرة عامة',
      draw: 'القرعة',
      schedule: 'البرنامج',
      results: 'النتائج',
      players: 'اللاعبون',
      registration: 'التسجيل',
      arenaHud: 'واجهة الساحة',
    },
    footer: {
      rights: '© 2024 بطولة تونس للبلياردو. جميع الحقوق محفوظة.',
      tagline: 'الترتيب والبرنامج والنتائج والتحكم المباشر في مساحة احترافية واحدة.',
    },
    home: {
      dataUnavailableTitle: 'مساحة البطولة',
      dataUnavailableBody:
        'بيانات البطولة المباشرة غير متاحة بعد. أضف اللاعبين والمباريات من لوحة الإدارة أو تحقّق من اتصال MongoDB في الإنتاج.',
      dataUnavailableAction: '/admin/dashboard',
      seasonKicker: (season: string, country: string) => `${country} · موسم ${season}`,
      heroTitle: 'بطولة تونس للبلياردو 2026',
      heroSubtitle:
        'يجمع أفضل المواهب التونسية في البلياردو ضمن منافسة حماسية، أنيقة ومليئة بالشغف. عِشْ لحظة اللعب، ادعم أبطالك، واكتشف حدثاً يحتسب فيه كلّ تسديدة.',
      leader: 'المتصدر',
      competition: 'المنافسة',
      progress: 'التقدم',
      playersCount: (count: number) => `${count} لاعبًا`,
      matchesCompleted: (completed: number, total: number) => `${completed}/${total} مباراة منجزة`,
      quickSnapshot: 'لمحة سريعة',
      tournamentPulse: 'نبض البطولة',
      liveReady: 'جاهز للبث المباشر',
      playersRegistered: 'اللاعبون المسجلون',
      matchesCompletedLabel: 'المباريات المنجزة',
      nextFixturesLoaded: 'المواجهات القادمة المحمّلة',
      professionalDirection: 'اتجاه احترافي',
      professionalText:
        'مساحة بطولة مركزة للمنظمين والطاقم والجماهير مع رؤية واضحة للبيانات.',
      leaderboard: 'الترتيب',
      standings: 'الترتيب',
      viewAllPlayers: 'عرض جميع اللاعبين',
      tableHeadings: {
        rank: '#',
        player: 'اللاعب',
        played: 'ل',
        wins: 'ف',
        losses: 'خ',
        frameDiff: 'الفارق',
        points: 'نقاط',
        form: 'الشكل',
      },
      upcoming: 'القادمة',
      scheduleFocus: 'تركيز البرنامج',
      fullSchedule: 'البرنامج الكامل',
      noUpcomingFixtures: 'لا توجد مواجهات قادمة محمّلة بعد.',
      completed: 'المنتهية',
      latestResults: 'أحدث النتائج',
      resultsCentre: 'مركز النتائج',
      noCompletedMatches: 'لا توجد مباريات منتهية بعد.',
      status: {
        scheduled: 'مجدولة',
        live: 'مباشر',
        postponed: 'مؤجلة',
        completed: 'منتهية',
      },
    },
    draw: {
      seasonKicker: (season: string) => `بنية البطولة لموسم ${season}`,
      title: 'القرعة والمجموعات',
      subtitle:
        'استكشف القرعة الرسمية لبطولة تونس للبلياردو 2026، بما في ذلك توزيع اللاعبين على المجموعات، اللاعبين المصنفين، وهيكل البطولة منذ انطلاق المنافسة.',
      officialParagraph:
        'يتم توزيع اللاعبين على مجموعاتهم بناءً على ترتيبهم. يُوضع المصنفون أولاً، ثم يُوزَّع اللاعبون المتبقون عشوائياً لضمان مجموعات متوازنة منذ أول مباراة.',
      readOnly: 'عرض فقط',
      adminManaged: 'تحت إدارة المشرف',
      balancedPools: 'مجموعات متوازنة',
      pools: 'المجموعات',
      players: 'اللاعبون',
      balance: 'التوازن',
      status: 'الحالة',
      poolsCreated: 'المجموعات المنشأة للقرعة الحالية',
      registeredPlayers: 'اللاعبون المسجلون في البطولة',
      groupSizeRange: 'نطاق حجم المجموعة',
      automaticBalance: 'توازن تلقائي بعد المجموعات المصنفة',
      seededFirst: 'المصنفون أولاً',
      seededFirstText:
        'أول لاعب في كل مجموعة يُعامل كرأس مجموعة مصنف ويظهر بشارة Seed.',
      balancedAllocation: 'توزيع متوازن',
      balancedAllocationText:
        'يتم توزيع اللاعبين المتبقين عشوائياً مع الحفاظ على أكبر قدر ممكن من توازن المجموعات.',
      readOnlyText:
        'يمكن للمستخدمين مشاهدة القرعة فقط. الإدارة وحدها تستطيع تحديد التصنيفات وإطلاق القرعة من لوحة التحكم.',
      noGroupsAssigned: 'لم يتم تعيين أي مجموعة بعد.',
      pool: 'مجموعة',
      playersInGroup: (count: number) => `${count} لاعبًا`,
      seed: 'مصنف',
      points: 'نقاط',
      even: 'متوازن',
      mixed: 'مختلط',
    },
    fixtures: {
      seasonKicker: (season: string) => `تقويم موسم ${season}`,
      title: 'البرنامج',
      subtitle:
        'تصفح البرنامج الرسمي لبطولة تونس للبلياردو 2026، بما في ذلك المباريات القادمة، أوقات الطاولات، وأهم تفاصيل الحدث لمتابعة المنافسة خطوة بخطوة.',
      fixturesCount: (count: number) => `${count} مواجهة`,
      upcomingEvents: 'الفعاليات القادمة',
      event: 'الفعالية',
      venue: 'المكان',
      matchCard: 'بطاقة المباراة',
      noUpcomingFixtures: 'لا توجد مواجهات مجدولة حتى الآن.',
      roundLabel: 'الدور',
      eventOneTitle: 'مرحلة المجموعات',
      eventOneDate: '1 مايو',
      eventOneNote: 'افتتاح المجموعات وبداية دور المجموعات.',
      eventTwoTitle: 'كأس تونس',
      eventTwoDate: 'قريباً',
      eventTwoNote: 'منافسة إضافية ظاهرة في البرنامج.',
    },
    players: {
      kicker: 'منصة اللاعبين',
      title: 'اللاعبون',
      subtitle:
        'بطاقات اللاعبين، سياق الترتيب، وطابع أكثر فخامة لدليل البطولة.',
      athletesCount: (count: number) => `${count} لاعبًا`,
      noPlayers: 'لا يوجد لاعبون مسجلون بعد.',
      points: 'نقاط',
      years: (age: number) => `${age} سنة`,
      metrics: {
        played: 'ل',
        wins: 'ف',
        losses: 'خ',
      },
    },
    playerDetail: {
      backToPlayers: 'العودة إلى اللاعبين',
      frames: 'الأشواط:',
      won: 'فاز بها',
      lost: 'خسرها',
      points: 'النقاط',
      played: 'لعب',
      wins: 'انتصارات',
      losses: 'هزائم',
      winRate: 'نسبة الفوز',
      matchHistory: 'سجل المباريات',
      vs: 'ضد',
      noMatches: 'لا توجد مباريات مسجلة.',
      statusCompleted: 'منتهية',
      shortWin: 'ف',
      shortLoss: 'خ',
    },
    results: {
      kicker: 'المباريات المنتهية',
      title: 'مركز النتائج',
      subtitle:
        'استكشف النتائج الرسمية لبطولة تونس للبلياردو 2026، بما في ذلك النتائج النهائية، سجل المباريات، ونظرة واضحة على المواجهات المكتملة طوال المنافسة.',
      resultsCount: (count: number) => `${count} نتيجة`,
      noCompletedMatches: 'لا توجد مباريات منتهية بعد.',
      final: 'النهائي',
    },
  },
} as const;

export function normalizeLanguage(value?: string | null): Language {
  if (value === 'fr' || value === 'en' || value === 'ar') {
    return value;
  }

  return DEFAULT_LANGUAGE;
}

export function getLanguageName(language: Language): string {
  return LANGUAGE_NAMES[language];
}

export function getLanguageDirection(language: Language): 'ltr' | 'rtl' {
  return DIRECTIONS[language];
}

export function getTranslations(language: Language) {
  return translations[language];
}

export function translateStatus(
  language: Language,
  status: 'scheduled' | 'live' | 'postponed' | 'completed'
) {
  return translations[language].home.status[status];
}