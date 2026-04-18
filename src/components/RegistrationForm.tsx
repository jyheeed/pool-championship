'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import type { Language } from '@/lib/i18n';

const TEXT = {
  fr: {
    successTitle: 'Inscription envoyée',
    successBody:
      'La demande est en attente de validation. Dès que l\'admin l\'approuve, un email de confirmation sera envoyé.',
    backHome: 'Retour à l\'accueil',
    newRegistration: 'Nouvelle inscription',
    title: 'Inscription joueur',
    subtitle: 'Demande de participation au championnat',
    notice:
      'Les joueurs de 18 ans et plus doivent renseigner leur CIN. Les demandes sont validées manuellement par l\'administrateur.',
    labels: {
      fullName: 'NOM COMPLET *',
      nickname: 'SURNOM (OPTIONNEL)',
      nationality: 'NATIONALITÉ *',
      age: 'ÂGE *',
      email: 'EMAIL *',
      phone: 'TÉLÉPHONE *',
      city: 'VILLE *',
      cinRequired: 'CIN *',
      cinOptional: 'CIN (OPTIONNEL)',
      club: 'CLUB (OPTIONNEL)',
      photo: 'PHOTO (OPTIONNELLE)',
    },
    placeholders: {
      fullName: 'ex. Malek Hamza',
      nickname: 'ex. The Shark',
      email: 'player@example.com',
      phone: '+216 ...',
      city: 'Tunis',
      cinRequired: 'Numéro CIN',
      cinOptional: 'Facultatif pour les mineurs',
      club: 'Club Billard Tunis',
      photoButton: 'Ajouter une photo',
      replacePhoto: 'Remplacer la photo',
      preview: 'Aperçu',
      remove: 'Supprimer',
      submit: 'Soumettre',
      submitting: 'Envoi...',
    },
    hints: {
      photo: 'JPG, PNG, WebP. 5 Mo max.',
      errorImageType: 'Veuillez envoyer un fichier image',
      errorImageSize: 'L’image doit mesurer 5 Mo ou moins',
      errorUpload: 'Impossible de traiter l’image',
      errorRead: 'Impossible de lire l’image',
      connection: 'Erreur de connexion. Veuillez réessayer plus tard.',
      generic: 'Une erreur est survenue',
    },
  },
  en: {
    successTitle: 'Registration sent',
    successBody:
      'The request is waiting for approval. Once the admin approves it, a confirmation email will be sent.',
    backHome: 'Back to home',
    newRegistration: 'New registration',
    title: 'Player registration',
    subtitle: 'Championship participation request',
    notice:
      'Players aged 18 and over must provide their CIN. Requests are approved manually by the administrator.',
    labels: {
      fullName: 'FULL NAME *',
      nickname: 'NICKNAME (OPTIONAL)',
      nationality: 'NATIONALITY *',
      age: 'AGE *',
      email: 'EMAIL *',
      phone: 'PHONE *',
      city: 'CITY *',
      cinRequired: 'CIN *',
      cinOptional: 'CIN (OPTIONAL)',
      club: 'CLUB (OPTIONAL)',
      photo: 'PHOTO (OPTIONAL)',
    },
    placeholders: {
      fullName: 'e.g. Malek Hamza',
      nickname: 'e.g. The Shark',
      email: 'player@example.com',
      phone: '+216 ...',
      city: 'Tunis',
      cinRequired: 'CIN number',
      cinOptional: 'Optional for minors',
      club: 'Club Billard Tunis',
      photoButton: 'Upload photo',
      replacePhoto: 'Replace photo',
      preview: 'Preview',
      remove: 'Remove',
      submit: 'Submit',
      submitting: 'Submitting...',
    },
    hints: {
      photo: 'JPG, PNG, WebP. Max 5 MB.',
      errorImageType: 'Please upload an image file',
      errorImageSize: 'Image must be 5 MB or smaller',
      errorUpload: 'Failed to process image',
      errorRead: 'Failed to read image',
      connection: 'Connection error. Please try again later.',
      generic: 'Something went wrong',
    },
  },
  ar: {
    successTitle: 'تم إرسال التسجيل',
    successBody:
      'الطلب قيد المراجعة. بمجرد موافقة المشرف سيتم إرسال رسالة تأكيد عبر البريد الإلكتروني.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    newRegistration: 'تسجيل جديد',
    title: 'تسجيل لاعب',
    subtitle: 'طلب المشاركة في البطولة',
    notice:
      'يجب على اللاعبين الذين تبلغ أعمارهم 18 سنة فأكثر إدخال رقم CIN. تتم الموافقة على الطلبات يدويًا من طرف الإدارة.',
    labels: {
      fullName: 'الاسم الكامل *',
      nickname: 'اللقب (اختياري)',
      nationality: 'الجنسية *',
      age: 'العمر *',
      email: 'البريد الإلكتروني *',
      phone: 'الهاتف *',
      city: 'المدينة *',
      cinRequired: 'CIN *',
      cinOptional: 'CIN (اختياري)',
      club: 'النادي (اختياري)',
      photo: 'الصورة (اختيارية)',
    },
    placeholders: {
      fullName: 'مثال: مالك حمزة',
      nickname: 'مثال: The Shark',
      email: 'player@example.com',
      phone: '+216 ...',
      city: 'تونس',
      cinRequired: 'رقم CIN',
      cinOptional: 'اختياري للقاصرين',
      club: 'Club Billard Tunis',
      photoButton: 'رفع صورة',
      replacePhoto: 'تغيير الصورة',
      preview: 'معاينة',
      remove: 'إزالة',
      submit: 'إرسال',
      submitting: 'جارٍ الإرسال...',
    },
    hints: {
      photo: 'JPG أو PNG أو WebP. الحجم الأقصى 5 MB.',
      errorImageType: 'يرجى رفع ملف صورة',
      errorImageSize: 'يجب ألا تتجاوز الصورة 5 MB',
      errorUpload: 'تعذر معالجة الصورة',
      errorRead: 'تعذر قراءة الصورة',
      connection: 'خطأ في الاتصال. حاول مرة أخرى لاحقًا.',
      generic: 'حدث خطأ ما',
    },
  },
} as const;

const emptyForm = {
  name: '',
  nickname: '',
  nationality: 'Tunisia',
  age: '',
  email: '',
  phone: '',
  city: '',
  cin: '',
  club: '',
  photoUrl: '',
};

const compactInputClass =
  'h-10 w-full rounded-lg border border-[#cfd5dd] bg-[#fcfcfd] px-3 text-[14px] text-[#1f2937] outline-none transition placeholder:text-[#98a2b3] focus:border-[#8c96a3] focus:bg-white focus:ring-2 focus:ring-[#dfe4ea]';

export default function RegistrationForm({ language }: { language: Language }) {
  const copy = TEXT[language];
  const [form, setForm] = useState(emptyForm);
  const [photoName, setPhotoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const needsCin = Number(form.age) >= 18;

  const validateField = (key: string, value: string): string | null => {
    if (key === 'name' && !value.trim()) return 'Full name is required';
    if (key === 'email' && !value.trim()) return 'Email is required';
    if (key === 'email' && value.trim() && !value.includes('@')) return 'Please enter a valid email';
    if (key === 'phone' && !value.trim()) return 'Phone number is required';
    if (key === 'city' && !value.trim()) return 'City is required';
    if (key === 'age' && !value) return 'Age is required';
    if (key === 'age' && (Number(value) < 5 || Number(value) > 99)) return 'Age must be between 5 and 99';
    if (key === 'cin' && needsCin && !value.trim()) return 'CIN is required for players 18 and older';
    return null;
  };

  const handleFieldBlur = (key: string) => {
    const error = validateField(key, form[key as keyof typeof form]);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[key] = error;
      else delete next[key];
      return next;
    });
  };

  const handleFieldChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) {
      setForm((current) => ({ ...current, photoUrl: '' }));
      setPhotoName('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(copy.hints.errorImageType);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(copy.hints.errorImageSize);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const source = String(reader.result || '');
          const image = new window.Image();
          image.onload = () => {
            const maxDimension = 1024;
            const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');

            if (!context) {
              resolve(source);
              return;
            }

            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          image.onerror = () => resolve(source);
          image.src = source;
        } catch {
          reject(new Error(copy.hints.errorUpload));
        }
      };
      reader.onerror = () => reject(new Error(copy.hints.errorRead));
      reader.readAsDataURL(file);
    });

    setForm((current) => ({ ...current, photoUrl: dataUrl }));
    setPhotoName(file.name);
    setError('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    // Final validation
    const errors: Record<string, string> = {};
    const requiredFields = ['name', 'email', 'phone', 'city', 'age'];
    requiredFields.forEach((field) => {
      const err = validateField(field, form[field as keyof typeof form]);
      if (err) errors[field] = err;
    });
    if (needsCin) {
      const cinErr = validateField('cin', form.cin);
      if (cinErr) errors.cin = cinErr;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        // Show specific error messages
        if (res.status === 409) {
          setError('This email is already registered. Please use a different email address.');
        } else if (data.error) {
          setError(data.error);
        } else {
          setError(copy.hints.generic);
        }
      }
    } catch {
      setError(copy.hints.connection);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl animate-in">
        <div className="rounded-[28px] border border-[#ececec] bg-[#f7f7f9] p-10 text-center shadow-[0_20px_55px_rgba(0,0,0,0.18)]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e9f9f1] text-[#20b26c]">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#1c2430]">{copy.successTitle}</h1>
          <p className="mt-4 text-[#5a6472]">
            {copy.successBody}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-[#f4c400] px-5 py-3 text-sm font-bold text-[#1b2330] transition hover:bg-[#e3b300]"
            >
              {copy.backHome}
            </Link>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setSuccess(false);
                setPhotoName('');
              }}
              className="rounded-xl border border-[#d8dbe0] bg-white px-5 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#f1f5f9]"
            >
              {copy.newRegistration}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-in">
      <div className="rounded-[22px] border border-[#e6e8ec] bg-[#f4f4f6] p-4 text-[#1f2937] shadow-[0_16px_40px_rgba(0,0,0,0.16)] md:p-5">
        <div className="mb-4 flex items-center gap-3 border-b border-[#d6dbe2] pb-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff3cc] text-[#c99a00]">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1c2430] md:text-[26px]">{copy.title}</h1>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] md:text-xs">{copy.subtitle}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[#ead48e] bg-[#fff8e1] px-3 py-2 text-xs font-medium text-[#5b4a14] md:text-sm">
          {copy.notice}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
            <AlertCircle size={18} />
            <p className="text-xs md:text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.labels.fullName} error={fieldErrors.name}>
              <input
                required
                className={`${compactInputClass} ${fieldErrors.name ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                placeholder={copy.placeholders.fullName}
              />
            </Field>

            <Field label={copy.labels.nickname}>
              <input
                className={compactInputClass}
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder={copy.placeholders.nickname}
              />
            </Field>

            <Field label={copy.labels.nationality}>
              <input
                required
                className={compactInputClass}
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </Field>

            <Field label={copy.labels.age} error={fieldErrors.age}>
              <input
                required
                type="number"
                min={5}
                max={99}
                className={`${compactInputClass} ${fieldErrors.age ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.age}
                onChange={(e) => handleFieldChange('age', e.target.value)}
                onBlur={() => handleFieldBlur('age')}
              />
            </Field>

            <Field label={copy.labels.email} error={fieldErrors.email}>
              <input
                required
                type="email"
                className={`${compactInputClass} ${fieldErrors.email ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder={copy.placeholders.email}
              />
            </Field>

            <Field label={copy.labels.phone} error={fieldErrors.phone}>
              <input
                required
                className={`${compactInputClass} ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                placeholder={copy.placeholders.phone}
              />
            </Field>

            <Field label={copy.labels.city} error={fieldErrors.city}>
              <input
                required
                className={`${compactInputClass} ${fieldErrors.city ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                onBlur={() => handleFieldBlur('city')}
                placeholder={copy.placeholders.city}
              />
            </Field>

            <Field label={needsCin ? copy.labels.cinRequired : copy.labels.cinOptional} error={fieldErrors.cin}>
              <input
                required={needsCin}
                className={`${compactInputClass} ${fieldErrors.cin ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                value={form.cin}
                onChange={(e) => handleFieldChange('cin', e.target.value)}
                onBlur={() => handleFieldBlur('cin')}
                placeholder={needsCin ? copy.placeholders.cinRequired : copy.placeholders.cinOptional}
              />
            </Field>

            <Field label={copy.labels.club}>
              <input
                className={compactInputClass}
                value={form.club}
                onChange={(e) => setForm({ ...form, club: e.target.value })}
                placeholder={copy.placeholders.club}
              />
            </Field>

            <Field label={copy.labels.photo}>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handlePhotoUpload(e.target.files?.[0] || null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#d6dbe2] bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f1f5f9]"
                >
                  {photoName ? copy.placeholders.replacePhoto : copy.placeholders.photoButton}
                </button>
                <p className="text-[11px] text-[#6b7280]">
                  {copy.hints.photo}
                </p>
                {photoName && (
                  <div className="flex items-center gap-3 rounded-lg border border-[#d6dbe2] bg-white p-2">
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-[#f1f5f9] text-[11px] text-[#64748b]">
                      {form.photoUrl ? (
                        <Image src={form.photoUrl} alt={copy.placeholders.preview} fill className="object-cover" unoptimized />
                      ) : (
                        copy.placeholders.preview
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1f2937]">{photoName}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, photoUrl: '' }));
                          setPhotoName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-1 text-xs font-semibold text-[#0f6bff] hover:underline"
                      >
                        {copy.placeholders.remove}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div className="flex justify-center pt-2">
            <button
              disabled={loading}
              className="min-w-[180px] rounded-lg bg-[#f4c400] px-6 py-2 text-lg font-display font-bold text-[#1e293b] transition hover:bg-[#e2b400] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? copy.placeholders.submitting : copy.placeholders.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className={`text-[10px] font-semibold uppercase tracking-[0.04em] md:text-[11px] ${error ? 'text-red-600' : 'text-[#3b4554]'}`}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}