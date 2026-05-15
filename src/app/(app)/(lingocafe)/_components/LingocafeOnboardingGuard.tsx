'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  BarChart3,
  BookOpen,
  Check,
  Gift,
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
  const missingItems = [
    !targetLang ? 'Select the language you want to improve.' : null,
    !effectiveOwnLang ? 'Let us detect your browser language.' : null,
    missingRequiredConsent ? 'Accept the required terms.' : null,
  ].filter((item): item is string => Boolean(item));
  const targetLangMissing = submitted && !targetLang;
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
      window.confirm(
        `Before starting, please complete:\n\n${missingItems.map(item => `- ${item}`).join('\n')}`
      );
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
      onOpenAutoFocus={event => event.preventDefault()}
      skipOpenAnimation={true}
      className="md:!h-screen md:!max-h-none md:!border-b-0"
      bodyClassName="flex min-h-0 justify-center p-6 pb-16 pt-12 md:items-start md:pb-20"
      ariaLabel="Complete your LingoCafe profile"
    >
      <form onSubmit={saveProfile} className="flex w-full max-w-5xl flex-col gap-8 pb-8">
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <h1 className="flex flex-col items-center justify-center gap-3 text-3xl font-semibold tracking-normal text-foreground sm:flex-row md:text-4xl">
            <span className="text-4xl leading-none sm:text-3xl" aria-hidden="true">
              🎉
            </span>
            Welcome to LingoCafe!
          </h1>
          <p className="text-lg leading-7 text-muted-foreground mb-8">
            Let&apos;s personalize your reading experience <b>three easy steps</b>.
            <br />
            <small>
              <i>You can change these anytime in your profile.</i>
            </small>
          </p>
        </div>

        {controller.loading ? (
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            Checking your profile...
          </div>
        ) : (
          <>
            <section
              data-invalid={targetLangMissing ? 'true' : undefined}
              className={
                targetLangMissing
                  ? '-mx-4 mt-6 grid gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 md:mt-0 md:grid-cols-[3rem_1fr] md:items-start'
                  : '-mx-4 mt-6 grid gap-4 rounded-lg border border-transparent p-4 md:mt-0 md:grid-cols-[3rem_1fr] md:items-start'
              }
            >
              <div className="flex h-9 w-fit items-center justify-center rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm md:size-9 md:self-center md:px-0 md:text-base">
                <span className="md:hidden">1 of 3</span>
                <span className="hidden md:inline">1</span>
              </div>
              <div className="space-y-4 md:contents">
                <div className="md:pt-5">
                  <h2 className="text-2xl font-semibold tracking-normal">
                    Which language do you want to improve?
                  </h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    This helps us show you books in the right language.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:col-start-2 lg:grid-cols-5">
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

            <section className="grid gap-4 pt-10 md:grid-cols-[3rem_1fr] md:items-start md:pt-0">
              <div className="flex h-9 w-fit items-center justify-center rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm md:size-9 md:self-center md:px-0 md:text-base">
                <span className="md:hidden">2 of 3</span>
                <span className="hidden md:inline">2</span>
              </div>
              <div className="space-y-4 md:contents">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal">
                    What&apos;s your reading level?
                  </h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    We&apos;ll recommend books that match your level.
                  </p>
                </div>

                <div className="grid gap-3 md:col-start-2 sm:grid-cols-2 lg:grid-cols-3">
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

            <section className="grid gap-4 pt-12 md:grid-cols-[3rem_1fr] md:items-start md:pt-0">
              <div className="flex h-9 w-fit items-center justify-center rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm md:size-9 md:self-center md:px-0 md:text-base">
                <span className="md:hidden">3 of 3</span>
                <span className="hidden md:inline">3</span>
              </div>
              <div className="space-y-4 md:contents">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal">The Boring One</h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    But very important for both of us!
                  </p>
                </div>

                <div className="grid gap-4 md:col-start-2 lg:grid-cols-2">
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
                      control="switch"
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
                      control="switch"
                    />
                  </div>
                </div>
              </div>
            </section>

            {message ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
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

        <div className="flex flex-col items-center gap-3 pt-5">
          <Button
            type="submit"
            size="hero"
            className="min-h-14 w-full bg-emerald-600 text-lg hover:bg-emerald-700 sm:max-w-3xl"
            disabled={controller.loading || controller.saving}
          >
            <BookOpen className="size-5" aria-hidden="true" />
            {controller.saving ? 'Saving...' : 'Start Reading'}
            <Sparkles className="size-5" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="justify-center text-muted-foreground"
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
