'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Gauge, LayoutGrid, Trophy, Users, UserPlus } from 'lucide-react';
import { getLanguageName, getTranslations, LANGUAGE_COOKIE, type Language } from '@/lib/i18n';

const NAV = [
  { href: '/', key: 'overview', icon: Gauge },
  { href: '/draw', key: 'draw', icon: LayoutGrid },
  { href: '/fixtures', key: 'schedule', icon: CalendarDays },
  { href: '/results', key: 'results', icon: Trophy },
  { href: '/players', key: 'players', icon: Users },
  { href: '/register', key: 'registration', icon: UserPlus },
];

export default function Navbar({ initialLanguage }: { initialLanguage: Language }) {
  const path = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const translations = getTranslations(language);

  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);

  function updateLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);

    if (typeof document !== 'undefined') {
      document.cookie = `${LANGUAGE_COOKIE}=${nextLanguage}; path=/; max-age=31536000`;
      document.documentElement.lang = nextLanguage;
      document.documentElement.dir = nextLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(5,12,11,0.76)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flag-pill tunisia-flag-wrap" aria-hidden="true">
            <svg viewBox="0 0 256 256" className="tunisia-flag" role="img" aria-hidden="true">
              <circle cx="128" cy="128" r="128" fill="#e6002d" />
              <circle cx="128" cy="128" r="61" fill="#ffffff" />
              <circle cx="114" cy="128" r="48" fill="#e6002d" />
              <circle cx="131" cy="128" r="34" fill="#ffffff" />
              <polygon points="161,128 141.8,134.4 141.8,154.5 129.9,138.1 110.7,144.4 122.6,128 110.7,111.6 129.9,117.9 141.8,101.5 141.8,121.6" fill="#e6002d" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-white/45">
              {translations.nav.brandTagline}
            </p>
            <p className="truncate text-base font-semibold text-white sm:text-lg">
              Tunisian Pool Championship
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <div className="language-switch" role="group" aria-label="Language selection">
            {(['fr', 'en', 'ar'] as Language[]).map((option) => {
              const active = option === language;

              return (
                <button
                  key={option}
                  type="button"
                  className={`language-switch-item ${active ? 'language-switch-item-active' : ''}`}
                  onClick={() => updateLanguage(option)}
                  aria-pressed={active}
                  aria-label={getLanguageName(option)}
                >
                  {option.toUpperCase()}
                </button>
              );
            })}
          </div>

          {NAV.map(({ href, key, icon: Icon }) => {
            const label = translations.nav[key as keyof typeof translations.nav] as string;
            const active = path === href;
            const isRegistration = href === '/register';
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${active ? 'nav-link-active' : ''} ${!active && isRegistration ? 'nav-link-cta' : ''}`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Link>
            );
          })}

        </div>
      </div>
    </header>
  );
}
