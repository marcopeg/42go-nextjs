"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/app/(app)/(lingocafe)/books/_components/BookCard";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  getConsentBoolean,
  LINGOCAFE_CONSENT_LABELS,
  LINGOCAFE_LEGAL_LINKS,
} from "@/config/lingocafe/profile-consent";

type LanguageOption = {
  code: string;
  label: string;
};

type LevelOption = {
  code: string;
  label: string;
};

type ReaderProfile = {
  userId: string;
  ownLang: string | null;
  targetLang: string | null;
  targetLevel: string | null;
  isComplete: boolean;
  data: unknown;
};

type ReaderData = {
  profile: ReaderProfile | null;
  books: ReaderBook[];
  languages: {
    own: LanguageOption[];
    target: LanguageOption[];
    levels: LevelOption[];
  };
};

const fallbackLanguages = {
  own: [
    { code: "en", label: "English" },
    { code: "it", label: "Italian" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "sv", label: "Swedish" },
    { code: "fr", label: "French" },
    { code: "pt", label: "Portuguese" },
    { code: "nl", label: "Dutch" },
    { code: "da", label: "Danish" },
    { code: "no", label: "Norwegian" },
    { code: "fi", label: "Finnish" },
    { code: "pl", label: "Polish" },
    { code: "cs", label: "Czech" },
    { code: "el", label: "Greek" },
  ] satisfies LanguageOption[],
  target: [
    { code: "en", label: "English" },
    { code: "it", label: "Italian" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "sv", label: "Swedish" },
  ] satisfies LanguageOption[],
  levels: [
    { code: "a2", label: "A2" },
    { code: "b1", label: "B1" },
  ] satisfies LevelOption[],
};
const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";
const fallbackReadingAction: ReaderBook["readingAction"] = {
  kind: "unavailable",
  label: "No pages available",
  href: null,
  bookId: "",
  pageId: null,
  progressBps: null,
};

const normalizeBookInfo = (info: unknown): Record<string, unknown> => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return {};
  return info as Record<string, unknown>;
};

const normalizeReaderData = (payload: Partial<ReaderData>): ReaderData => ({
  profile: payload.profile ?? null,
  books: Array.isArray(payload.books)
    ? payload.books.map((book) => ({
        ...book,
        info: normalizeBookInfo(book.info),
        cover: book.cover ?? null,
        coverFallback: book.coverFallback || coverFallbackUrl,
        readingAction: book.readingAction ?? {
          ...fallbackReadingAction,
          bookId: book.id,
        },
      }))
    : [],
  languages: {
    own:
      Array.isArray(payload.languages?.own) && payload.languages.own.length > 0
        ? payload.languages.own
        : fallbackLanguages.own,
    target: Array.isArray(payload.languages?.target)
      ? payload.languages.target
      : fallbackLanguages.target,
    levels:
      Array.isArray(payload.languages?.levels) &&
      payload.languages.levels.length > 0
        ? payload.languages.levels
        : fallbackLanguages.levels,
  },
});

const BooksPage = () => {
  const { status } = useSession();
  const [data, setData] = useState<ReaderData | null>(null);
  const [ownLang, setOwnLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [earlyBirdsConsent, setEarlyBirdsConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();

    const loadBooks = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/lingocafe/books", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Could not load books.");
        }

        const payload = normalizeReaderData(await res.json());
        setData(payload);
        setOwnLang(payload.profile?.ownLang || "");
        setTargetLang(payload.profile?.targetLang || "");
        setTargetLevel(payload.profile?.targetLevel || "");
        setAcceptedTerms(getConsentBoolean(payload.profile?.data, "terms"));
        setAcknowledgedPrivacy(
          getConsentBoolean(payload.profile?.data, "privacy")
        );
        setMarketingConsent(getConsentBoolean(payload.profile?.data, "mkt"));
        setEarlyBirdsConsent(getConsentBoolean(payload.profile?.data, "alpha"));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load books.");
      } finally {
        setLoading(false);
      }
    };

    loadBooks();

    return () => controller.abort();
  }, [status]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/lingocafe/profile", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownLang,
          targetLang,
          targetLevel,
          consent: {
            terms: acceptedTerms,
            privacy: acknowledgedPrivacy,
            mkt: marketingConsent,
            alpha: earlyBirdsConsent,
          },
          consentSource: "books-onboarding",
        }),
      });

      if (!res.ok) {
        throw new Error("Could not save language preferences.");
      }

      setData(normalizeReaderData(await res.json()));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save language preferences."
      );
    } finally {
      setSaving(false);
    }
  };

  const targetLabel =
    data?.languages.target.find(
      (option) => option.code === data.profile?.targetLang
    )?.label || data?.profile?.targetLang;
  const showProfileForm = !!data && !data.profile?.isComplete;
  const languages = data?.languages || fallbackLanguages;

  return (
    <AppLayout
      title="Books"
      subtitle={
        showProfileForm
          ? "Welcome, complete your profile."
          : targetLabel
          ? `Catalog filtered for ${targetLabel}.`
          : "Here are the books."
      }
      stickyHeader={true}
      policy={{ require: { feature: "page:books", session: true } }}
    >
      <div className="min-w-0 max-w-full overflow-x-clip space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading books...
          </div>
        )}

        {!loading && showProfileForm && (
          <form
            onSubmit={saveProfile}
            className="max-w-xl space-y-5 rounded-lg border bg-card p-5 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Welcome, complete your profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Set your own language, target language, and reading level.
              </p>
            </div>

            <label className="block space-y-2 text-sm font-medium">
              <span>Your language</span>
              <select
                value={ownLang}
                onChange={(event) => setOwnLang(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                required
              >
                <option value="">Choose your language</option>
                {languages.own.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Reading language</span>
              <select
                value={targetLang}
                onChange={(event) => setTargetLang(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                required
              >
                <option value="">Choose reading language</option>
                {languages.target.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Reading level</span>
              <select
                value={targetLevel}
                onChange={(event) => setTargetLevel(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                required
              >
                <option value="">Choose reading level</option>
                {languages.levels.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-4 border-t pt-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 size-4 rounded border-input accent-primary"
                  required
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
                  className="mt-1 size-4 rounded border-input accent-primary"
                  required
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

            <div className="space-y-4 border-t pt-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(event) =>
                    setMarketingConsent(event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span>{LINGOCAFE_CONSENT_LABELS.mkt}</span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={earlyBirdsConsent}
                  onChange={(event) =>
                    setEarlyBirdsConsent(event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span>{LINGOCAFE_CONSENT_LABELS.alpha}</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={
                saving ||
                !ownLang ||
                !targetLang ||
                !targetLevel ||
                !acceptedTerms ||
                !acknowledgedPrivacy
              }
            >
              {saving ? "Saving..." : "Save preferences"}
            </Button>
          </form>
        )}

        {!loading && !showProfileForm && data && data.books.length === 0 && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            No books are available for this language yet.
          </div>
        )}

        {!loading && !showProfileForm && data && data.books.length > 0 && (
          <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BooksPage;
