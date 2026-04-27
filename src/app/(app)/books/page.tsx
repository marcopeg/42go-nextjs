"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

type LanguageOption = {
  code: string;
  label: string;
};

type ReaderProfile = {
  userId: string;
  ownLang: string | null;
  targetLang: string | null;
  targetLevel: string | null;
  data: unknown;
};

type ReaderBook = {
  id: string;
  lang: string;
  level: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  cover: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ReaderData = {
  profile: ReaderProfile | null;
  books: ReaderBook[];
  languages: {
    own: LanguageOption[];
    target: LanguageOption[];
  };
};

const BooksPage = () => {
  const { status } = useSession();
  const [data, setData] = useState<ReaderData | null>(null);
  const [ownLang, setOwnLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
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
        const res = await fetch("/api/books", {
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Could not load books.");
        }

        const payload = (await res.json()) as ReaderData;
        setData(payload);
        setOwnLang(payload.languages.own[0]?.code || "");
        setTargetLang(payload.languages.target[0]?.code || "");
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
      const res = await fetch("/api/books", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownLang, targetLang }),
      });

      if (!res.ok) {
        throw new Error("Could not save language preferences.");
      }

      setData((await res.json()) as ReaderData);
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

  return (
    <AppLayout
      title="Books"
      subtitle={
        targetLabel
          ? `Catalog filtered for ${targetLabel}.`
          : "Choose your language pair to start reading."
      }
      stickyHeader={true}
      policy={{ require: { feature: "page:books", session: true } }}
    >
      <div className="space-y-6">
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

        {!loading && data && !data.profile && (
          <form
            onSubmit={saveProfile}
            className="max-w-xl space-y-5 rounded-lg border bg-card p-5 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">Set your languages</h2>
              <p className="text-sm text-muted-foreground">
                Pick the language you know and the language you want to read.
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
                {data.languages.own.map((option) => (
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
                {data.languages.target.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Button type="submit" disabled={saving || !ownLang || !targetLang}>
              {saving ? "Saving..." : "Save preferences"}
            </Button>
          </form>
        )}

        {!loading && data?.profile && data.books.length === 0 && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            No books are available for this language yet.
          </div>
        )}

        {!loading && data?.profile && data.books.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.books.map((book) => (
              <article
                key={book.id}
                className="rounded-lg border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold">{book.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {book.author}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase">
                    {book.lang} / {book.level}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {book.description}
                </p>
                {book.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {!loading && data && !data.profile && data.books.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.books.map((book) => (
              <article
                key={book.id}
                className="rounded-lg border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold">{book.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {book.author}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase">
                    {book.lang} / {book.level}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BooksPage;
