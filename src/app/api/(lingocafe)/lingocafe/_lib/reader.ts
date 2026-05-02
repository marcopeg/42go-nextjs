import { getServerSession } from "next-auth";
import type { Knex } from "knex";
import { z } from "zod";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";

type LanguageOption = {
  code: string;
  label: string;
};

type LevelOption = {
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

type ProfilePayload = {
  ownLang: string;
  targetLang: string;
  targetLevel: string;
};

type ProfileUpdateDiff = Partial<
  Record<keyof ProfilePayload, { before: string | null; after: string }>
>;

type BookRow = {
  id: string;
  project: string;
  lang: string;
  level: string;
  title: string;
  author: string;
  tags: string[] | string | null;
  info: unknown;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type BookInfoRow = BookRow & {
  description: string;
};

type BookPageRow = {
  book_id: string;
  id: string;
  position: number;
};

type BookInfoPageRow = BookPageRow & {
  kind: string;
  prefix: string | null;
  title: string;
};

type BookInfoPageSummary = {
  bookId: string;
  pageId: string;
  position: number;
  kind: string;
  prefix: string | null;
  title: string;
  href: string;
};

type BookPageDetailRow = BookPageRow & {
  kind: string;
  prefix: string | null;
  title: string;
  summary: string | null;
  content: string | null;
};

type BookPageBookRow = Pick<
  BookInfoRow,
  "id" | "project" | "lang" | "level" | "title" | "author" | "info"
>;

type BookProgressRow = {
  book_id: string;
  page_id: string;
  progress_bps: number;
};

type BookProgress = {
  bookId: string;
  pageId: string;
  progressBps: number;
};

type BookReadingAction = {
  kind: "start" | "resume" | "unavailable";
  label: "Read now" | "Continue reading" | "No pages available";
  href: string | null;
  bookId: string;
  pageId: string | null;
  progressBps: number | null;
};

type BookPageNeighbor = {
  bookId: string;
  pageId: string;
  position: number;
  prefix: string | null;
  title: string;
  href: string;
};

export type BookPageDetail = {
  book: {
    id: string;
    project: string;
    lang: string;
    level: string;
    title: string;
    author: string;
    info: Record<string, unknown>;
    cover: string | null;
    coverFallback: string;
  };
  page: {
    bookId: string;
    pageId: string;
    position: number;
    kind: string;
    prefix: string | null;
    title: string;
    summary: string | null;
    content: string;
  };
  previous: BookPageNeighbor | null;
  next: BookPageNeighbor | null;
  pages: BookInfoPageSummary[];
};

const defaultAssetsBasePath = "https://assets.lingocafe.app";
const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";

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

const readingLevels: LevelOption[] = [
  { code: "a2", label: "A2" },
  { code: "b1", label: "B1" },
];

export const getReaderLanguages = () => ({
  own: [...ownLanguages],
  target: [...targetLanguages],
  levels: [...readingLevels],
});

export const json = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
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

const normalizeBookInfo = (info: unknown): Record<string, unknown> => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return {};
  return info as Record<string, unknown>;
};

const getLingoCafeAssetsBasePath = () => {
  const basePath =
    process.env.LC_ASSETS_BASE_PATH?.trim() || defaultAssetsBasePath;
  return basePath.replace(/\/+$/, "");
};

const resolveBookCover = (book: Pick<BookRow, "project">) => {
  const project = book.project.trim().replace(/^\/+|\/+$/g, "");
  if (!project) return null;
  return `${getLingoCafeAssetsBasePath()}/${project}/reader`;
};

const buildReadPageHref = (
  bookId: string,
  pageId: string,
  progressBps?: number | null
) => {
  const href = `/books/${encodeURIComponent(bookId)}/${encodeURIComponent(
    pageId
  )}`;

  if (progressBps === null || progressBps === undefined) {
    return href;
  }

  const params = new URLSearchParams({
    progress_bps: String(progressBps),
  });

  return `${href}?${params.toString()}`;
};

const clampProgressBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

const mapBookPageNeighbor = (
  page: BookPageDetailRow | undefined,
  bookId: string
): BookPageNeighbor | null => {
  if (!page) return null;

  return {
    bookId,
    pageId: page.id,
    position: page.position,
    prefix: page.prefix,
    title: page.title,
    href: buildReadPageHref(bookId, page.id),
  };
};

const mapBookPageDetail = ({
  book,
  page,
  previous,
  next,
  pages,
}: {
  book: BookPageBookRow;
  page: BookPageDetailRow;
  previous?: BookPageDetailRow;
  next?: BookPageDetailRow;
  pages: BookInfoPageRow[];
}): BookPageDetail => ({
  book: {
    id: book.id,
    project: book.project,
    lang: book.lang,
    level: book.level,
    title: book.title,
    author: book.author,
    info: normalizeBookInfo(book.info),
    cover: resolveBookCover(book),
    coverFallback: coverFallbackUrl,
  },
  page: {
    bookId: page.book_id,
    pageId: page.id,
    position: page.position,
    kind: page.kind,
    prefix: page.prefix,
    title: page.title,
    summary: page.summary,
    content: page.content ?? "",
  },
  previous: mapBookPageNeighbor(previous, book.id),
  next: mapBookPageNeighbor(next, book.id),
  pages: pages.map(mapBookInfoPage),
});

const createReadingAction = ({
  bookId,
  progress,
  firstPage,
}: {
  bookId: string;
  progress?: BookProgressRow | null;
  firstPage?: BookPageRow | null;
}): BookReadingAction => {
  if (progress) {
    return {
      kind: "resume",
      label: "Continue reading",
      href: buildReadPageHref(bookId, progress.page_id, progress.progress_bps),
      bookId,
      pageId: progress.page_id,
      progressBps: progress.progress_bps,
    };
  }

  if (firstPage) {
    return {
      kind: "start",
      label: "Read now",
      href: buildReadPageHref(bookId, firstPage.id),
      bookId,
      pageId: firstPage.id,
      progressBps: null,
    };
  }

  return {
    kind: "unavailable",
    label: "No pages available",
    href: null,
    bookId,
    pageId: null,
    progressBps: null,
  };
};

export const getSessionUserId = async (): Promise<string | null> => {
  const session = await getServerSession(await getAuthOptions());
  const sessionUserId = session?.user?.id || null;
  const sessionEmail = session?.user?.email || null;
  if (!sessionUserId) return null;

  const db = getDB();
  const user = await db("auth.users").where({ id: sessionUserId }).first();
  if (user?.id) return user.id as string;

  if (!sessionEmail) return null;

  const appId = (await getAppID()) || "default";
  const userByEmail = await db("auth.users")
    .where("app_id", appId)
    .andWhere("email", "ilike", sessionEmail)
    .first();

  if (userByEmail?.id) return userByEmail.id as string;

  return null;
};

const isProfileComplete = (profile: ProfileRow | undefined) =>
  !!profile?.own_lang && !!profile.target_lang && !!profile.target_level;

const mapProfile = (profile: ProfileRow | undefined) => {
  if (!profile) return null;

  return {
    userId: profile.user_id,
    ownLang: profile.own_lang,
    targetLang: profile.target_lang,
    targetLevel: profile.target_level,
    isComplete: isProfileComplete(profile),
    data: profile.data ?? {},
  };
};

const mapBook = (book: BookRow) => ({
  id: book.id,
  project: book.project,
  lang: book.lang,
  level: book.level,
  title: book.title,
  author: book.author,
  tags: normalizeTags(book.tags),
  info: normalizeBookInfo(book.info),
  cover: resolveBookCover(book),
  coverFallback: coverFallbackUrl,
  publishedAt: toISO(book.published_at),
  createdAt: toISO(book.created_at),
  updatedAt: toISO(book.updated_at),
});

const mapBookInfo = (book: BookInfoRow, readingAction: BookReadingAction) => ({
  ...mapBook(book),
  description: book.description,
  readingAction,
});

const mapBookInfoPage = (page: BookInfoPageRow): BookInfoPageSummary => ({
  bookId: page.book_id,
  pageId: page.id,
  position: page.position,
  kind: page.kind,
  prefix: page.prefix,
  title: page.title,
  href: buildReadPageHref(page.book_id, page.id),
});

const mapBookProgress = (progress: BookProgressRow): BookProgress => ({
  bookId: progress.book_id,
  pageId: progress.page_id,
  progressBps: progress.progress_bps,
});

export const loadReaderData = async (userId: string) => {
  const db = getDB();
  const languages = getReaderLanguages();
  const profile = (await db("lingocafe.profiles")
    .where({ user_id: userId })
    .first()) as ProfileRow | undefined;
  const profileComplete = isProfileComplete(profile);

  if (!profileComplete) {
    return {
      profile: mapProfile(profile),
      books: [],
      languages,
    };
  }

  const booksQuery = db("lingocafe.books")
    .select(
      "id",
      "project",
      "lang",
      "level",
      "title",
      "author",
      "tags",
      "info",
      "published_at",
      "created_at",
      "updated_at"
    )
    .orderBy([
      { column: "level", order: "asc" },
      { column: "title", order: "asc" },
    ]);

  if (profile?.target_lang) {
    booksQuery.where({ lang: profile.target_lang });
  }

  const books = (await booksQuery) as BookRow[];
  const bookIds = books.map((book) => book.id);
  const progressRows =
    bookIds.length > 0
      ? ((await db("lingocafe.books_progress")
          .select("book_id", "page_id", "progress_bps")
          .where({ user_id: userId })
          .whereIn("book_id", bookIds)) as BookProgressRow[])
      : [];
  const firstPageRows =
    bookIds.length > 0
      ? ((await db("lingocafe.books_pages")
          .select("book_id", "id", "position")
          .whereIn("book_id", bookIds)
          .orderBy([
            { column: "book_id", order: "asc" },
            { column: "position", order: "asc" },
          ])) as BookPageRow[])
      : [];
  const firstPageByBookId = new Map<string, BookPageRow>();
  for (const row of firstPageRows) {
    const existing = firstPageByBookId.get(row.book_id);
    if (!existing || row.position < existing.position) {
      firstPageByBookId.set(row.book_id, row);
    }
  }
  const progressByBookId = new Map(progressRows.map((row) => [row.book_id, row]));

  return {
    profile: mapProfile(profile),
    books: books.map((book) => ({
      ...mapBook(book),
      readingAction: createReadingAction({
        bookId: book.id,
        progress: progressByBookId.get(book.id),
        firstPage: firstPageByBookId.get(book.id),
      }),
    })),
    languages,
  };
};

export const loadBookInfo = async (bookId: string, userId: string) => {
  const db = getDB();
  const book = (await db("lingocafe.books")
    .select(
      "id",
      "project",
      "lang",
      "level",
      "title",
      "author",
      "tags",
      "description",
      "info",
      "published_at",
      "created_at",
      "updated_at"
    )
    .where({ id: bookId })
    .first()) as BookInfoRow | undefined;

  if (!book) return null;

  const progress = (await db("lingocafe.books_progress")
    .select("book_id", "page_id", "progress_bps")
    .where({ user_id: userId, book_id: bookId })
    .first()) as BookProgressRow | undefined;

  const firstPage = progress
    ? null
    : ((await db("lingocafe.books_pages")
        .select("book_id", "id", "position")
        .where({ book_id: bookId })
        .orderBy("position", "asc")
        .first()) as BookPageRow | undefined);

  const pages = (await db("lingocafe.books_pages")
    .select("book_id", "id", "position", "kind", "prefix", "title")
    .where({ book_id: bookId })
    .orderBy("position", "asc")) as BookInfoPageRow[];

  return {
    ...mapBookInfo(
      book,
      createReadingAction({
        bookId: book.id,
        progress,
        firstPage,
      })
    ),
    pages: pages.map(mapBookInfoPage),
  };
};

export const loadBookPage = async (bookId: string, pageId: string) => {
  const db = getDB();
  const book = (await db("lingocafe.books")
    .select("id", "project", "lang", "level", "title", "author", "info")
    .where({ id: bookId })
    .first()) as BookPageBookRow | undefined;

  if (!book) return null;

  const page = (await db("lingocafe.books_pages")
    .select("book_id", "id", "position", "kind", "prefix", "title", "summary", "content")
    .where({ book_id: bookId, id: pageId })
    .first()) as BookPageDetailRow | undefined;

  if (!page) return null;

  const previous = (await db("lingocafe.books_pages")
    .select("book_id", "id", "position", "kind", "prefix", "title", "summary", "content")
    .where({ book_id: bookId })
    .where("position", "<", page.position)
    .orderBy("position", "desc")
    .first()) as BookPageDetailRow | undefined;

  const next = (await db("lingocafe.books_pages")
    .select("book_id", "id", "position", "kind", "prefix", "title", "summary", "content")
    .where({ book_id: bookId })
    .where("position", ">", page.position)
    .orderBy("position", "asc")
    .first()) as BookPageDetailRow | undefined;

  const pages = (await db("lingocafe.books_pages")
    .select("book_id", "id", "position", "kind", "prefix", "title")
    .where({ book_id: bookId })
    .orderBy("position", "asc")) as BookInfoPageRow[];

  return mapBookPageDetail({ book, page, previous, next, pages });
};

export const loadBookProgress = async (userId: string, bookId: string) => {
  const db = getDB();
  const progress = (await db("lingocafe.books_progress")
    .select("book_id", "page_id", "progress_bps")
    .where({ user_id: userId, book_id: bookId })
    .first()) as BookProgressRow | undefined;

  return progress ? mapBookProgress(progress) : null;
};

export const saveBookProgress = async ({
  userId,
  bookId,
  pageId,
  progressBps,
}: {
  userId: string;
  bookId: string;
  pageId: string;
  progressBps: number;
}) => {
  const db = getDB();
  const normalizedProgressBps = clampProgressBps(progressBps);

  await db("lingocafe.books_progress")
    .insert({
      user_id: userId,
      book_id: bookId,
      page_id: pageId,
      progress_bps: normalizedProgressBps,
      updated_at: db.fn.now(),
    })
    .onConflict(["user_id", "book_id"])
    .merge({
      page_id: pageId,
      progress_bps: normalizedProgressBps,
      updated_at: db.fn.now(),
    });

  return normalizedProgressBps;
};

export const saveBookOpenProgress = async ({
  userId,
  bookId,
  pageId,
}: {
  userId: string;
  bookId: string;
  pageId: string;
}) => {
  const progress = await loadBookProgress(userId, bookId);

  if (progress?.pageId === pageId) {
    return progress;
  }

  const progressBps = await saveBookProgress({
    userId,
    bookId,
    pageId,
    progressBps: 0,
  });

  return { bookId, pageId, progressBps };
};

export const trackReaderEvent = async ({
  userId,
  name,
  bookId,
  pageId = null,
  data = {},
  meta = {},
  db = getDB(),
}: {
  userId: string;
  name: string;
  bookId?: string | null;
  pageId?: string | null;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  db?: Knex | Knex.Transaction;
}) => {
  await db.raw("SELECT lingocafe.events_prepare_partitions()");
  await db("lingocafe.events").insert({
    user_id: userId,
    name,
    book_id: bookId ?? null,
    page_id: pageId,
    data,
    meta,
  });
};

const buildProfileUpdateDiff = (
  currentProfile: ProfileRow | undefined,
  nextProfile: ProfilePayload
): ProfileUpdateDiff => {
  const fields = [
    {
      key: "ownLang",
      before: currentProfile?.own_lang ?? null,
      after: nextProfile.ownLang,
    },
    {
      key: "targetLang",
      before: currentProfile?.target_lang ?? null,
      after: nextProfile.targetLang,
    },
    {
      key: "targetLevel",
      before: currentProfile?.target_level ?? null,
      after: nextProfile.targetLevel,
    },
  ] as const;

  return fields.reduce<ProfileUpdateDiff>((diff, field) => {
    if (field.before !== field.after) {
      diff[field.key] = {
        before: field.before,
        after: field.after,
      };
    }

    return diff;
  }, {});
};

const languageCodeSchema = (options: LanguageOption[]) =>
  z.string().refine((value) => options.some((option) => option.code === value), {
    message: "Unsupported language code",
  });

const levelCodeSchema = (options: LevelOption[]) =>
  z.string().refine((value) => options.some((option) => option.code === value), {
    message: "Unsupported reading level",
  });

export const parseProfilePayload = async (req: Request) => {
  const languages = getReaderLanguages();
  const schema = z.object({
    ownLang: languageCodeSchema(languages.own),
    targetLang: languageCodeSchema(languages.target),
    targetLevel: levelCodeSchema(languages.levels),
  });

  return schema.safeParse(await req.json().catch(() => null));
};

export const saveProfile = async (
  userId: string,
  profile: ProfilePayload
) => {
  const db = getDB();

  await db.transaction(async (trx) => {
    const currentProfile = (await trx("lingocafe.profiles")
      .where({ user_id: userId })
      .first()) as ProfileRow | undefined;
    const diff = buildProfileUpdateDiff(currentProfile, profile);

    if (Object.keys(diff).length === 0) {
      return;
    }

    await trx("lingocafe.profiles")
      .insert({
        user_id: userId,
        own_lang: profile.ownLang,
        target_lang: profile.targetLang,
        target_level: profile.targetLevel,
        data: {},
      })
      .onConflict("user_id")
      .merge({
        own_lang: profile.ownLang,
        target_lang: profile.targetLang,
        target_level: profile.targetLevel,
      });

    await trackReaderEvent({
      userId,
      name: "profile-update",
      data: { diff },
      db: trx,
    });
  });

  return loadReaderData(userId);
};
