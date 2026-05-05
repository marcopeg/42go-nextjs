"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";
import {
  getConsentBoolean,
  LINGOCAFE_CONSENT_LABELS,
} from "@/config/lingocafe/profile-consent";

type ReaderData = {
  profile: {
    data: unknown;
  } | null;
};

const normalizeReaderData = (payload: Partial<ReaderData>): ReaderData => ({
  profile: payload.profile ?? null,
});

export const LingoCafeContent = () => {
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [earlyBirdsConsent, setEarlyBirdsConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/lingocafe/profile", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Could not load marketing preferences.");
        }

        const payload = normalizeReaderData(await res.json());
        setMarketingConsent(getConsentBoolean(payload.profile?.data, "mkt"));
        setEarlyBirdsConsent(getConsentBoolean(payload.profile?.data, "alpha"));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load marketing preferences."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => controller.abort();
  }, []);

  const validate = useCallback(() => {
    if (loading) {
      const message = "Marketing preferences are still loading.";
      setError(message);
      return { ok: false as const, message };
    }

    setError(null);
    return { ok: true as const };
  }, [loading]);

  const persist = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/lingocafe/profile", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: {
            mkt: marketingConsent,
            alpha: earlyBirdsConsent,
          },
          consentSource: "profile",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.message || "Could not save marketing preferences."
        );
      }

      const payload = normalizeReaderData(await res.json());
      setMarketingConsent(getConsentBoolean(payload.profile?.data, "mkt"));
      setEarlyBirdsConsent(getConsentBoolean(payload.profile?.data, "alpha"));

      return { ok: true as const, message: "Marketing preferences saved." };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save marketing preferences.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setSaving(false);
    }
  }, [earlyBirdsConsent, marketingConsent]);

  useProfileBlockHandle(
    useMemo(
      () => ({
        validate,
        persist,
      }),
      [validate, persist]
    )
  );

  const disabled = loading || saving;

  return (
    <SimplePanel
      title="Marketing & Opportunities"
      description="Choose optional LingoCafe updates and Early Birds participation."
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading marketing preferences...
          </p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(event) => setMarketingConsent(event.target.checked)}
                disabled={disabled}
                className="mt-1 size-4 rounded border-input accent-primary"
              />
              <span>{LINGOCAFE_CONSENT_LABELS.mkt}</span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={earlyBirdsConsent}
                onChange={(event) => setEarlyBirdsConsent(event.target.checked)}
                disabled={disabled}
                className="mt-1 size-4 rounded border-input accent-primary"
              />
              <span>{LINGOCAFE_CONSENT_LABELS.alpha}</span>
            </label>
          </div>
        )}
      </div>
    </SimplePanel>
  );
};
