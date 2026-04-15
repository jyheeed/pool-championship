'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import type { Language } from '@/lib/i18n';

const LANGUAGE_COOKIE = 'pool-lang';

const TEXT = {
  fr: {
    title: 'Connexion admin',
    subtitle: 'Panneau de gestion du championnat',
    username: 'Nom d’utilisateur',
    password: 'Mot de passe',
    submit: 'Se connecter',
    signingIn: 'Connexion...',
    invalid: 'Identifiants invalides',
    connection: 'Erreur de connexion',
  },
  en: {
    title: 'Admin Login',
    subtitle: 'Championship management panel',
    username: 'Username',
    password: 'Password',
    submit: 'Sign In',
    signingIn: 'Signing in...',
    invalid: 'Invalid credentials',
    connection: 'Connection error',
  },
  ar: {
    title: 'تسجيل دخول المشرف',
    subtitle: 'لوحة إدارة البطولة',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    signingIn: 'جارٍ الدخول...',
    invalid: 'بيانات اعتماد غير صحيحة',
    connection: 'خطأ في الاتصال',
  },
} as const;

function getLanguage(): Language {
  if (typeof document === 'undefined') {
    return 'fr';
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : 'fr';
  return value === 'fr' || value === 'en' || value === 'ar' ? value : 'fr';
}

export default function AdminLoginPage() {
  const [language, setLanguage] = useState<Language>('fr');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = TEXT[language];

  useEffect(() => {
    setLanguage(getLanguage());
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || t.invalid);
      }
    } catch {
      setError(t.connection);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-[var(--accent-green)]" />
          </div>
          <h1 className="font-display text-2xl">{t.title}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] uppercase mb-1.5">{t.username}</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-green)] transition-colors"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] uppercase mb-1.5">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-green)] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[var(--accent-green)] text-black font-mono text-sm font-bold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t.signingIn : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
