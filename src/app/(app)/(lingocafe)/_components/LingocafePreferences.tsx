"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";

type LanguageOption = {
  code: string;
  label: string;
};

type LevelOption = {
  code: string;
  label: string;
};

type ReaderProfile = {
  ownLang: string | null;
  targetLang: string | null;
  targetLevel: string | null;
};

type ReaderData = {
  profile: ReaderProfile | null;
  languages: {
    own: LanguageOption[];
    target: LanguageOption[];
    levels: LevelOption[];
  };
};

const emptyLanguages: ReaderData["languages"] = {
  own: [],
  target: [],
  levels: [],
};

const normalizeReaderData = (payload: Partial<ReaderData>): ReaderData => ({
  profile: payload.profile ?? null,
  languages: {
    own: Array.isArray(payload.languages?.own) ? payload.languages.own : [],
    target: Array.isArray(payload.languages?.target)
      ? payload.languages.target
      : [],
    levels: Array.isArray(payload.languages?.levels)
      ? payload.languages.levels
      : [],
  },
});

export const LingocafePreferences = () => {
  const [data, setData] = useState<ReaderData>({
    profile: null,
    languages: emptyLanguages,
  });
  const [ownLang, setOwnLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
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
          throw new Error("Could not load language preferences.");
        }

        const payload = normalizeReaderData(await res.json());
        setData(payload);
        setOwnLang(payload.profile?.ownLang || "");
        setTargetLang(payload.profile?.targetLang || "");
        setTargetLevel(payload.profile?.targetLevel || "");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load language preferences."
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
      const message = "Language preferences are still loading.";
      setError(message);
      return { ok: false as const, message };
    }

    if (!ownLang || !targetLang || !targetLevel) {
      const message = "Choose your language, learning language, and level.";
      setError(message);
      return { ok: false as const, message };
    }

    setError(null);
    return { ok: true as const };
  }, [loading, ownLang, targetLang, targetLevel]);

  const persist = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/lingocafe/profile", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownLang, targetLang, targetLevel }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.message || "Could not save language preferences."
        );
      }

      const payload = normalizeReaderData(await res.json());
      setData(payload);
      setOwnLang(payload.profile?.ownLang || ownLang);
      setTargetLang(payload.profile?.targetLang || targetLang);
      setTargetLevel(payload.profile?.targetLevel || targetLevel);

      return { ok: true as const, message: "Language preferences saved." };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save language preferences.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setSaving(false);
    }
  }, [ownLang, targetLang, targetLevel]);

  useProfileBlockHandle(
    useMemo(
      () => ({
        validate,
        persist,
      }),
      [validate, persist]
    )
  );

  const languages = data.languages;
  const disabled = loading || saving;

  return (
    <SimplePanel
      title="Language Preferences"
      description="Set how LingoCafe chooses your reading material."
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading language preferences...
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2 text-sm font-medium">
              <span>Your language</span>
              <select
                value={ownLang}
                onChange={(event) => setOwnLang(event.target.value)}
                disabled={disabled}
                aria-invalid={!ownLang}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose language</option>
                {languages.own.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Learning language</span>
              <select
                value={targetLang}
                onChange={(event) => setTargetLang(event.target.value)}
                disabled={disabled}
                aria-invalid={!targetLang}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose language</option>
                {languages.target.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Level</span>
              <select
                value={targetLevel}
                onChange={(event) => setTargetLevel(event.target.value)}
                disabled={disabled}
                aria-invalid={!targetLevel}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose level</option>
                {languages.levels.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </SimplePanel>
  );
};
