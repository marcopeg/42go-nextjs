'use client';

import { useCallback, useMemo, useState } from 'react';
import { BarChart3, Check, Rocket, Sprout } from 'lucide-react';

import { SimplePanel } from '@/42go/components/panel';
import { useProfileBlockHandle } from '@/42go/components/ProfileBlock/ProfileBlockRuntime';
import { useProfile } from '@/42go/profile/client';
import { getLingoCafeReaderLanguages } from '@/config/lingocafe/profile-options';
import { cn } from '@/lib/utils';

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

export const LingocafePreferences = () => {
  const { profile, setProfileValue, loading, saving } = useProfile();
  const [submitted, setSubmitted] = useState(false);
  const ownLang = typeof profile.ownLang === 'string' ? profile.ownLang : '';
  const targetLang = typeof profile.targetLang === 'string' ? profile.targetLang : '';
  const targetLevel = typeof profile.targetLevel === 'string' ? profile.targetLevel : '';
  const disabled = loading || saving;
  const missing = !ownLang || !targetLang;

  const validate = useCallback(() => {
    setSubmitted(true);

    if (missing) {
      return {
        ok: false as const,
        message: 'Choose your language and learning language.',
      };
    }

    return { ok: true as const };
  }, [missing]);

  useProfileBlockHandle(useMemo(() => ({ validate }), [validate]));

  if (loading) {
    return (
      <SimplePanel title="Language Preferences">
        <p className="text-sm text-muted-foreground">Loading language preferences...</p>
      </SimplePanel>
    );
  }

  return (
    <div className="space-y-5">
      {submitted && missing && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Choose your fluent language and reading language.
        </div>
      )}

      <SimplePanel
        title="Your Fluent Language"
        description="Used when LingoCafe translates or explains reading content."
      >
        <label className="block max-w-sm space-y-2 text-sm font-medium">
          <span className="sr-only">Your fluent language</span>
          <select
            value={ownLang}
            onChange={event => setProfileValue('ownLang', event.target.value)}
            disabled={disabled}
            aria-invalid={submitted && !ownLang}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
          >
            <option value="">Choose language</option>
            {languages.own.map(option => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </SimplePanel>

      <SimplePanel title="Reading Language" description="Choose the language you want to improve.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {languages.target.map(option => {
            const selected = targetLang === option.code;

            return (
              <button
                key={option.code}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => setProfileValue('targetLang', option.code)}
                className={
                  selected
                    ? 'relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-emerald-600 bg-emerald-50 px-3 text-center shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-950/30'
                    : 'flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border bg-background px-3 text-center shadow-xs outline-none transition hover:border-emerald-500 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {selected && (
                  <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                )}
                <span className="text-3xl leading-none" aria-hidden="true">
                  {option.flag}
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>
      </SimplePanel>

      <SimplePanel
        title="Reading level"
        description="Pick the level that best matches your reading comfort."
      >
        <div
          role="tablist"
          aria-label="Reading level"
          className="flex flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-1"
        >
          {levelItems.map(item => {
            const Icon = item.icon;
            const selected = targetLevel === item.code;

            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => setProfileValue('targetLevel', selected ? null : item.code)}
                className={cn(
                  'flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium transition-colors outline-none sm:h-12 sm:gap-2 sm:px-2 sm:text-sm',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  selected
                    ? 'border-[var(--primary)] bg-primary/5 text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${item.iconClassName}`} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </SimplePanel>
    </div>
  );
};
