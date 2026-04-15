import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from '@/components/Navbar';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, getLanguageDirection, getTranslations, normalizeLanguage } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Tunisian Pool Championship',
  description: 'Premium tournament hub for standings, players, schedule, results and live arena controls.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);
  const translations = getTranslations(language);

  return (
    <html lang={language} dir={getLanguageDirection(language)}>
      <body className="min-h-screen">
        <div className="app-bg" />
        <div className="app-noise" />
        <Navbar initialLanguage={language} />
        <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">{children}</main>
        <footer className="mt-16 border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-white/70">{translations.footer.rights}</p>
              <p>{translations.footer.tagline}</p>
            </div>
            <p>Tunisian Pool Championship</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
