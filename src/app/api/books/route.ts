import { getServerSession } from "next-auth";
import { z } from "zod";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy";

type LanguageOption = {
  code: string;
  label: string;
};

type ProfileRow = {
  user_id: string;
  own_lang: string | null;
  target_lang: string | null;
  target_level: string | null;
  data: unknown;
};

type BookRow = {
  id: string;
  lang: string;
  level: string;
  title: string;
  description: string;
  author: string;
  tags: string[] | string | null;
  cover: string | null;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const ownLanguages: LanguageOption[] = [
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
];

const targetLanguages: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "it", label: "Italian" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "sv", label: "Swedish" },
];

const getReaderLanguages = () => ({
  own: [...ownLanguages],
  target: [...targetLanguages],
});

const toISO = (value: Date | string | null): string | null => {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
};

const normalizeTags = (tags: BookRow["tags"]): string[] => {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  return tags
    .replace(/[{}]/g, "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const getSessionUserId = async (): Promise<string | null> => {
  const session = await getServerSession(await getAuthOptions());
  return session?.user?.id || null;
};

const mapProfile = (profile: ProfileRow | undefined) => {
  if (!profile) return null;

  return {
    userId: profile.user_id,
    ownLang: profile.own_lang,
    targetLang: profile.target_lang,
    targetLevel: profile.target_level,
    data: profile.data ?? {},
  };
};

const mapBook = (book: BookRow) => ({
  id: book.id,
  lang: book.lang,
  level: book.level,
  title: book.title,
  description: book.description,
  author: book.author,
  tags: normalizeTags(book.tags),
  cover: book.cover,
  publishedAt: toISO(book.published_at),
  createdAt: toISO(book.created_at),
  updatedAt: toISO(book.updated_at),
});

const loadReaderData = async (userId: string) => {
  const db = getDB();
  const languages = getReaderLanguages();
  const profile = (await db("lingocafe.profiles")
    .where({ user_id: userId })
    .first()) as ProfileRow | undefined;

  const booksQuery = db("lingocafe.books").select("*").orderBy([
    { column: "level", order: "asc" },
    { column: "title", order: "asc" },
  ]);

  if (profile?.target_lang) {
    booksQuery.where({ lang: profile.target_lang });
  }

  const books = (await booksQuery) as BookRow[];

  return {
    profile: mapProfile(profile),
    books: books.map(mapBook),
    languages,
  };
};

const languageCodeSchema = (options: LanguageOption[]) =>
  z.string().refine((value) => options.some((option) => option.code === value), {
    message: "Unsupported language code",
  });

const getBooks = async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  return Response.json(await loadReaderData(userId));
};

const saveProfile = async (req: Request) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const languages = getReaderLanguages();
  const schema = z.object({
    ownLang: languageCodeSchema(languages.own),
    targetLang: languageCodeSchema(languages.target),
  });
  const parsed = schema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return Response.json(
      {
        error: "validation",
        message: "Invalid onboarding language selection",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const db = getDB();
  await db("lingocafe.profiles")
    .insert({
      user_id: userId,
      own_lang: parsed.data.ownLang,
      target_lang: parsed.data.targetLang,
      data: {},
    })
    .onConflict("user_id")
    .merge({
      own_lang: parsed.data.ownLang,
      target_lang: parsed.data.targetLang,
    });

  return Response.json(await loadReaderData(userId));
};

export const GET = protectRoute(getBooks, {
  require: { feature: "api:books", session: true },
});

export const POST = protectRoute(saveProfile, {
  require: { feature: "api:books", session: true },
});
