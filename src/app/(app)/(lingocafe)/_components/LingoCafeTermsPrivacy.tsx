"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";
import {
  getConsentBoolean,
  LINGOCAFE_LEGAL_LINKS,
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

export const LingoCafeTermsPrivacy = () => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(false);
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
          throw new Error("Could not load legal acknowledgements.");
        }

        const payload = normalizeReaderData(await res.json());
        setAcceptedTerms(getConsentBoolean(payload.profile?.data, "terms"));
        setAcknowledgedPrivacy(
          getConsentBoolean(payload.profile?.data, "privacy")
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load legal acknowledgements."
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
      const message = "Legal acknowledgements are still loading.";
      setError(message);
      return { ok: false as const, message };
    }

    if (!acceptedTerms) {
      const message = "Accept the Terms and Conditions before saving.";
      setError(message);
      return { ok: false as const, message };
    }

    if (!acknowledgedPrivacy) {
      const message = "Acknowledge the Privacy Policy before saving.";
      setError(message);
      return { ok: false as const, message };
    }

    setError(null);
    return { ok: true as const };
  }, [acceptedTerms, acknowledgedPrivacy, loading]);

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
            terms: acceptedTerms,
            privacy: acknowledgedPrivacy,
          },
          consentSource: "profile",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.message || "Could not save legal acknowledgements."
        );
      }

      const payload = normalizeReaderData(await res.json());
      setAcceptedTerms(getConsentBoolean(payload.profile?.data, "terms"));
      setAcknowledgedPrivacy(
        getConsentBoolean(payload.profile?.data, "privacy")
      );

      return { ok: true as const, message: "Legal acknowledgements saved." };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save legal acknowledgements.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setSaving(false);
    }
  }, [acceptedTerms, acknowledgedPrivacy]);

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
      title="Terms and Privacy"
      description="Required acknowledgements for your LingoCafe profile."
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading legal acknowledgements...
          </p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                disabled={disabled}
                className="mt-1 size-4 rounded border-input accent-primary"
              />
              <span>
                {LINGOCAFE_CONSENT_LABELS.terms}{" "}
                <Link
                  href={LINGOCAFE_LEGAL_LINKS.terms}
                  className="font-medium underline underline-offset-4"
                >
                  Read terms
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledgedPrivacy}
                onChange={(event) =>
                  setAcknowledgedPrivacy(event.target.checked)
                }
                disabled={disabled}
                className="mt-1 size-4 rounded border-input accent-primary"
              />
              <span>
                {LINGOCAFE_CONSENT_LABELS.privacy}{" "}
                <Link
                  href={LINGOCAFE_LEGAL_LINKS.privacy}
                  className="font-medium underline underline-offset-4"
                >
                  Read privacy policy
                </Link>
              </span>
            </label>
          </div>
        )}
      </div>
    </SimplePanel>
  );
};
