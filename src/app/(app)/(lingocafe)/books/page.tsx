"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import type { TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";
import type { Policy } from "@/42go/policy/types";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/app/(app)/(lingocafe)/books/_components/BookCard";
import { BooksHeaderLanguageFlag } from "@/app/(app)/(lingocafe)/books/_components/BooksHeaderLanguageFlag";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { useLingocafeRouteLoading } from "@/app/(app)/(lingocafe)/books/_components/useLingocafeRouteLoading";
import { useAppConfig } from "@/42go/config/use-app-config";
import { ProfileConsent } from "@/42go/profile/ProfileConsent";
import { getConsentCurrentValues } from "@/42go/profile/consent";
import type { TConsentData, TConsentConfig } from "@/42go/profile";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";

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
  consent: TConsentData | null;
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

const fallbackLanguages = getLingoCafeReaderLanguages();
const consentMethod = "checkbox-submit";
const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";
const fallbackReadingAction: ReaderBook["readingAction"] = {
  kind: "unavailable",
  label: "No pages available",
  href: null,
  bookId: "",
  pageId: null,
  progressBps: null,
};
const BOOKS_PAGE_POLICY: Policy = {
  require: { feature: "page:books", session: true },
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

const getResponseMessage = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === "string" ? payload.message : fallback;
};

const BooksPage = () => {
  const config = useAppConfig();
  const { status } = useSession();
  const [data, setData] = useState<ReaderData | null>(null);
  const [ownLang, setOwnLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [consentValues, setConsentValues] = useState<Record<string, boolean>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showLoading = useLingocafeRouteLoading({
    isLoading: loading,
    canDelay: !!data,
  });

  const applyReaderData = (
    payload: ReaderData,
    consentConfig?: TConsentConfig | null
  ) => {
    setData(payload);
    setOwnLang(payload.profile?.ownLang || "");
    setTargetLang(payload.profile?.targetLang || "");
    setTargetLevel(payload.profile?.targetLevel || "");
    setConsentValues(
      getConsentCurrentValues(payload.profile?.consent, consentConfig)
    );
  };

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
          throw new Error(await getResponseMessage(res, "Could not load books."));
        }

        const payload = normalizeReaderData(await res.json());
        applyReaderData(payload, config?.app?.consent);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load books.");
      } finally {
        setLoading(false);
      }
    };

    loadBooks();

    return () => controller.abort();
  }, [config?.app?.consent, status]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            ownLang,
            targetLang,
            targetLevel,
          },
          consent: consentValues,
          source: "books-onboarding",
          method: consentMethod,
        }),
      });

      if (!res.ok) {
        throw new Error(
          await getResponseMessage(res, "Could not save language preferences.")
        );
      }

      const booksRes = await fetch("/api/lingocafe/books", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!booksRes.ok) {
        throw new Error(await getResponseMessage(booksRes, "Could not reload books."));
      }

      applyReaderData(
        normalizeReaderData(await booksRes.json()),
        config?.app?.consent
      );
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
  const headerActions: TComponentBlock[] =
    !showProfileForm && data?.profile?.targetLang
      ? [
          {
            type: "component",
            component: BooksHeaderLanguageFlag,
            props: {
              code: data.profile.targetLang,
              label: targetLabel,
            },
          },
        ]
      : [];
  const languages = data?.languages || fallbackLanguages;
  const consentItems = config?.app?.consent?.items || [];
  const missingRequiredConsent = consentItems.some(
    (item) => item.required && consentValues[item.name] !== true
  );

  return (
    <AppLayout
      title="Books"
      subtitle={
        showProfileForm
          ? "Welcome, complete your profile."
          : targetLabel
            ? undefined
            : "Here are the books."
      }
      actions={headerActions}
      stickyHeader={true}
      policy={BOOKS_PAGE_POLICY}
    >
      <div className="min-w-0 max-w-full overflow-x-clip space-y-6">
        {error && !showLoading && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showLoading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading books...
          </div>
        )}

        {!showLoading && showProfileForm && (
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

            <div className="border-t pt-4">
              <ProfileConsent
                items={consentItems}
                values={consentValues}
                onChange={(name, value) =>
                  setConsentValues((current) => ({
                    ...current,
                    [name]: value,
                  }))
                }
                disabled={saving}
                submitted={submitted}
              />
            </div>

            <Button
              type="submit"
              disabled={
                saving ||
                !ownLang ||
                !targetLang ||
                !targetLevel ||
                missingRequiredConsent
              }
            >
              {saving ? "Saving..." : "Save preferences"}
            </Button>
          </form>
        )}

        {!showLoading && !showProfileForm && data && data.books.length === 0 && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            No books are available for this language yet.
          </div>
        )}

        {!showLoading && !showProfileForm && data && data.books.length > 0 && (
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
