import { cookies } from 'next/headers';
import RegistrationForm from '@/components/RegistrationForm';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, normalizeLanguage } from '@/lib/i18n';

export default function RegisterPage() {
  const language = normalizeLanguage(cookies().get(LANGUAGE_COOKIE)?.value ?? DEFAULT_LANGUAGE);

  return <RegistrationForm language={language} />;
}
