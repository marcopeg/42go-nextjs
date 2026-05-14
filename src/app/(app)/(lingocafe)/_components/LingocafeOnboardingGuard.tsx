'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  BarChart3,
  BookOpen,
  Check,
  Gift,
  Hand,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react';

import { Modal } from '@/42go/components/modal';
import type { TProfileLayoutGuardProps } from '@/42go/components/ProfileBlock';
import { useAppConfig } from '@/42go/config/use-app-config';
import type { TProfileData } from '@/42go/profile';
import { ProfileConsent } from '@/42go/profile/ProfileConsent';
import { useProfileController } from '@/42go/profile/client';
import { Button } from '@/components/ui/button';
import { setCachedLingoCafeProfileCompletion } from '@/config/lingocafe/profile-completion-cache';
import {
  getLingoCafeReaderLanguages,
  resolveLingoCafeOwnLanguage,
} from '@/config/lingocafe/profile-options';

const languages = getLingoCafeReaderLanguages();

const levelItems = [
  {
    code: 'a1',
    label: 'Beginner',
    icon: Sprout,
    iconClassName: 'text-emerald-600',
  },
  {
    code: 'a2',
    label: 'Intermediate',
    icon: BarChart3,
    iconClassName: 'text-amber-500',
  },
  {
    code: 'b2',
    label: 'Advanced',
    icon: Rocket,
    iconClassName: 'text-violet-600',
  },
] as const;

const getStringValue = (value: unknown) => (typeof value === 'string' ? value : '');

const getBrowserLanguageTags = () => {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
};

export const LingocafeOnboardingGuard = ({
  refreshKey: _refreshKey,
  releaseBeforeGuard,
}: TProfileLayoutGuardProps) => {
  void _refreshKey;

  const config = useAppConfig();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(true);
  const releasedRef = useRef(false);
  const controller = useProfileController({
    profile: config?.app?.profile,
    consent: config?.app?.consent,
  });
  const detectedOwnLang = useMemo(() => resolveLingoCafeOwnLanguage(getBrowserLanguageTags()), []);

  const releaseGuard = useCallback(
    (delayMs = 0) => {
      if (!releaseBeforeGuard || releasedRef.current) return;

      releasedRef.current = true;
      releaseBeforeGuard({ delayMs });
    },
    [releaseBeforeGuard]
  );

  useEffect(() => {
    if (!releaseBeforeGuard) return;

    if (status === 'unauthenticated') {
      releaseGuard();
      return;
    }

    if (!controller.loading && controller.isComplete) {
      setCachedLingoCafeProfileCompletion(true, userId);
      releaseGuard();
      return;
    }

    if (!controller.loading && !controller.isComplete) {
      setCachedLingoCafeProfileCompletion(false, userId);
    }
  }, [controller.isComplete, controller.loading, releaseBeforeGuard, releaseGuard, status, userId]);

  const showLoadingOnly =
    releaseBeforeGuard && status !== 'authenticated' && status !== 'unauthenticated';

  if (status !== 'authenticated' && !showLoadingOnly) return null;
  if (!controller.loading && controller.isComplete) return null;

  const profile = controller.profile;
  const ownLang = getStringValue(profile.ownLang);
  const effectiveOwnLang = ownLang || detectedOwnLang;
  const targetLang = getStringValue(profile.targetLang);
  const targetLevel = getStringValue(profile.targetLevel);
  const consentItems = config?.app?.consent?.items || [];
  const requiredConsentItems = consentItems.filter(item => item.required);
  const optionalConsentItems = consentItems.filter(item => !item.required);
  const missingRequiredConsent = consentItems.some(
    item => item.required && controller.consent[item.name] !== true
  );
  const canSubmit =
    !controller.loading &&
    !controller.saving &&
    !!effectiveOwnLang &&
    !!targetLang &&
    !missingRequiredConsent;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);

    if (!canSubmit) {
      setMessage('Complete the required profile fields before continuing.');
      return;
    }

    try {
      const profileToSave: TProfileData = {
        ...controller.profile,
        ownLang: effectiveOwnLang,
      };

      if (!targetLevel) {
        delete profileToSave.targetLevel;
      }

      const payload = await controller.save({ profile: profileToSave });

      if (payload.isComplete) {
        setCachedLingoCafeProfileCompletion(true, userId);

        if (releaseBeforeGuard) {
          setModalOpen(false);
          releaseGuard(300);
        }

        window.dispatchEvent(new Event('profile:complete'));
        return;
      }

      setMessage('Profile is still incomplete. Check the required fields.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save your profile.');
    }
  };

  return (
    <Modal
      open={modalOpen}
      onOpenChange={() => {}}
      presentation="panel"
      anchor="top"
      size="full"
      showClose={false}
      closeOnOverlayClick={false}
      skipOpenAnimation={true}
      className="md:!h-screen md:!max-h-none md:!border-b-0"
      bodyClassName="flex min-h-0 justify-center p-6 pb-16 pt-12 md:items-start md:pb-20"
      ariaLabel="Complete your LingoCafe profile"
    >
      <form onSubmit={saveProfile} className="flex w-full max-w-5xl flex-col gap-8 pb-8">
        <div className="space-y-3">
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
            <Hand className="size-9 text-amber-400" aria-hidden="true" />
            Welcome to LingoCafe!
          </h1>
          <p className="max-w-3xl text-lg leading-7 text-muted-foreground">
            Let&apos;s personalize your reading experience in a few easy steps. You can change these
            anytime in your profile.
          </p>
        </div>

        {controller.loading ? (
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            Checking your profile...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-base font-semibold text-white shadow-sm">
                1
              </div>
              <div className="space-y-4 pt-3 md:pt-5">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal">
                    Which language do you want to improve?
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    This helps us show you books in the right language.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {languages.target.map(option => {
                    const selected = targetLang === option.code;

                    return (
                      <button
                        key={option.code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => controller.setProfileValue('targetLang', option.code)}
                        className={
                          selected
                            ? 'relative flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 text-center shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 dark:bg-emerald-950/30'
                            : 'flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border bg-background px-4 text-center shadow-xs outline-none transition hover:border-emerald-500 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-emerald-600'
                        }
                      >
                        {selected && (
                          <span className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                            <Check className="size-5" aria-hidden="true" />
                          </span>
                        )}
                        <span className="text-4xl leading-none" aria-hidden="true">
                          {option.flag}
                        </span>
                        <span className="text-base font-semibold">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-base font-semibold text-white shadow-sm">
                2
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal">
                    What&apos;s your reading level?
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    We&apos;ll recommend books that match your level.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {levelItems.map(item => {
                    const Icon = item.icon;
                    const selected = targetLevel === item.code;

                    return (
                      <button
                        key={item.code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => controller.setProfileValue('targetLevel', item.code)}
                        className={
                          selected
                            ? 'flex min-h-16 items-center justify-center gap-3 rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 text-base font-semibold shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 dark:bg-emerald-950/30'
                            : 'flex min-h-16 items-center justify-center gap-3 rounded-lg border bg-background px-4 text-base font-semibold shadow-xs outline-none transition hover:border-emerald-500 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-emerald-600'
                        }
                      >
                        <Icon className={`size-6 ${item.iconClassName}`} aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-4 pt-4 md:grid-cols-[3rem_1fr]">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-base font-semibold text-white shadow-sm">
                3
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal">Almost there!</h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    A couple of quick things before you start reading.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background p-5 shadow-xs">
                    <div className="mb-4 flex items-center gap-3 text-lg font-semibold">
                      <ShieldCheck className="size-6 text-foreground" aria-hidden="true" />
                      Required
                    </div>
                    <ProfileConsent
                      items={requiredConsentItems}
                      values={controller.consent}
                      onChange={controller.setConsentValue}
                      disabled={controller.saving}
                      submitted={submitted}
                      showRequiredMarker={false}
                    />
                  </div>

                  <div className="rounded-lg border bg-background p-5 shadow-xs">
                    <div className="mb-4 flex items-center gap-3 text-lg font-semibold">
                      <Gift className="size-6 text-blue-600" aria-hidden="true" />
                      Useful
                    </div>
                    <ProfileConsent
                      items={optionalConsentItems}
                      values={controller.consent}
                      onChange={controller.setConsentValue}
                      disabled={controller.saving}
                      submitted={submitted}
                      showRequiredMarker={false}
                    />
                  </div>
                </div>
              </div>
            </section>

            {message ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message}
              </div>
            ) : null}

            {controller.errors.length > 0 ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {controller.errors.map(error => error.message).join(' ')}
              </div>
            ) : null}
          </>
        )}

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            size="hero"
            className="order-1 min-h-14 flex-1 bg-emerald-600 text-lg hover:bg-emerald-700 sm:order-2 sm:max-w-3xl"
            disabled={!canSubmit}
          >
            <BookOpen className="size-5" aria-hidden="true" />
            {controller.saving ? 'Saving...' : 'Start Reading'}
            <Sparkles className="size-5" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="order-2 justify-center text-muted-foreground sm:order-1 sm:justify-start sm:px-0 sm:hover:px-3"
            onClick={() => signOut({ callbackUrl: config?.auth?.logout?.url || '/' })}
          >
            Log out
          </Button>
        </div>
        <p className="flex items-center justify-center gap-2 pb-10 text-sm text-muted-foreground md:pb-0">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Your information is safe with us.
        </p>
      </form>
    </Modal>
  );
};

export default LingocafeOnboardingGuard;
