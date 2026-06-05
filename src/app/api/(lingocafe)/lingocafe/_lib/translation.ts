import "server-only";

import crypto from "node:crypto";
import type { Knex } from "knex";

import { getDB } from "@/42go/db";

export type TranslationCacheSource = "memory" | "database" | "google";

export type TranslationResult = {
  hash: string;
  from: string;
  to: string;
  text: string;
  translation: string;
  source: TranslationCacheSource;
};

type TranslationCacheRow = {
  hash: string;
  from: string;
  to: string;
  text: string;
  translation: string;
};

export type TranslationInput = {
  text: string;
  from: string;
  to: string;
};

type MemoryEntry = TranslationResult & {
  bytes: number;
  lastUsedAt: number;
};

type TranslateProvider = (input: TranslationInput) => Promise<string>;

class TranslationProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationProviderConfigError";
  }
}

export class TranslationProviderError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "TranslationProviderError";
    this.status = status;
  }
}

const defaultMemoryCacheMb = 20;
const memoryCache = new Map<string, MemoryEntry>();
let memoryCacheBytes = 0;

export const isTranslationEnabled = () =>
  process.env.LC_ENABLE_TRANSLATE === "true";

export const normalizeTranslationText = (text: string) =>
  text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const normalizeTranslationLanguage = (lang: string) =>
  lang.normalize("NFKC").trim().toLocaleLowerCase();

export const buildTranslationHash = ({
  text,
  from,
  to,
}: TranslationInput) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        text: normalizeTranslationText(text),
        from: normalizeTranslationLanguage(from),
        to: normalizeTranslationLanguage(to),
      })
    )
    .digest("hex");

const getMemoryCacheMaxBytes = () => {
  const parsed = Number(process.env.LC_TRANSLATION_MEMORY_CACHE_MB);
  const mb =
    Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMemoryCacheMb;
  return Math.floor(mb * 1024 * 1024);
};

const estimateBytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

const touchMemoryEntry = (entry: MemoryEntry): TranslationResult => {
  entry.lastUsedAt = Date.now();

  return {
    hash: entry.hash,
    from: entry.from,
    to: entry.to,
    text: entry.text,
    translation: entry.translation,
    source: "memory",
  };
};

const getMemoryCache = (hash: string) => {
  const entry = memoryCache.get(hash);
  return entry ? touchMemoryEntry(entry) : null;
};

const evictMemoryCache = () => {
  const maxBytes = getMemoryCacheMaxBytes();

  while (memoryCacheBytes > maxBytes && memoryCache.size > 0) {
    const oldest = [...memoryCache.values()].sort(
      (a, b) => a.lastUsedAt - b.lastUsedAt
    )[0];
    if (!oldest) return;
    memoryCache.delete(oldest.hash);
    memoryCacheBytes -= oldest.bytes;
  }
};

const setMemoryCache = (result: Omit<TranslationResult, "source">) => {
  const entry: MemoryEntry = {
    ...result,
    source: "memory",
    bytes: estimateBytes(result),
    lastUsedAt: Date.now(),
  };
  const previous = memoryCache.get(result.hash);
  if (previous) {
    memoryCacheBytes -= previous.bytes;
  }

  memoryCache.set(result.hash, entry);
  memoryCacheBytes += entry.bytes;
  evictMemoryCache();
};

const getDatabaseCache = async ({
  hash,
  db,
}: {
  hash: string;
  db: Knex;
}): Promise<TranslationResult | null> => {
  const row = (await db("lingocafe.translation_cache")
    .select("hash", "from", "to", "text", "translation")
    .where({ hash })
    .first()) as TranslationCacheRow | undefined;

  if (!row) return null;

  await db("lingocafe.translation_cache")
    .where({ hash })
    .update({ last_used_at: db.fn.now() });

  const result: Omit<TranslationResult, "source"> = {
    hash: row.hash,
    from: row.from,
    to: row.to,
    text: row.text,
    translation: row.translation,
  };
  setMemoryCache(result);

  return { ...result, source: "database" };
};

const setDatabaseCache = async ({
  result,
  db,
}: {
  result: Omit<TranslationResult, "source">;
  db: Knex;
}) => {
  await db("lingocafe.translation_cache")
    .insert({
      hash: result.hash,
      from: result.from,
      to: result.to,
      text: result.text,
      translation: result.translation,
      updated_at: db.fn.now(),
      last_used_at: db.fn.now(),
    })
    .onConflict("hash")
    .merge({
      from: result.from,
      to: result.to,
      text: result.text,
      translation: result.translation,
      updated_at: db.fn.now(),
      last_used_at: db.fn.now(),
    });
};

const getGoogleTranslateProvider = (): TranslateProvider => {
  const apiKey = process.env.LC_GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) {
    throw new TranslationProviderConfigError(
      "Missing LC_GOOGLE_TRANSLATE_API_KEY."
    );
  }

  return async ({ text, from, to }) => {
    const url = new URL("https://translation.googleapis.com/language/translate/v2");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: "text",
      }),
    });

    if (!res.ok) {
      throw new TranslationProviderError(
        `Google translation failed with status ${res.status}.`,
        502
      );
    }

    const payload = (await res.json().catch(() => null)) as {
      data?: { translations?: Array<{ translatedText?: unknown }> };
    } | null;
    const translatedText = payload?.data?.translations?.[0]?.translatedText;

    if (typeof translatedText !== "string" || translatedText.length === 0) {
      throw new TranslationProviderError("Google translation returned no text.");
    }

    return translatedText;
  };
};

export const getCachedTranslation = async ({
  text,
  from,
  to,
  db = getDB(),
}: TranslationInput & { db?: Knex }): Promise<TranslationResult | null> => {
  const normalizedFrom = normalizeTranslationLanguage(from);
  const normalizedTo = normalizeTranslationLanguage(to);
  const hash = buildTranslationHash({
    text,
    from: normalizedFrom,
    to: normalizedTo,
  });
  const memory = getMemoryCache(hash);
  if (memory) return memory;

  const database = await getDatabaseCache({ hash, db });
  if (database) return database;

  return null;
};

export const translateAndCacheText = async ({
  text,
  from,
  to,
  db = getDB(),
}: TranslationInput & { db?: Knex }): Promise<TranslationResult> => {
  const normalizedFrom = normalizeTranslationLanguage(from);
  const normalizedTo = normalizeTranslationLanguage(to);
  const hash = buildTranslationHash({
    text,
    from: normalizedFrom,
    to: normalizedTo,
  });

  let provider: TranslateProvider;
  try {
    provider = getGoogleTranslateProvider();
  } catch (error) {
    if (error instanceof TranslationProviderConfigError) {
      throw new TranslationProviderError(error.message, 503);
    }
    throw error;
  }

  const translation = await provider({
    text,
    from: normalizedFrom,
    to: normalizedTo,
  });
  const result: Omit<TranslationResult, "source"> = {
    hash,
    from: normalizedFrom,
    to: normalizedTo,
    text,
    translation,
  };

  await setDatabaseCache({ result, db });
  setMemoryCache(result);

  return { ...result, source: "google" };
};

export const translateText = async (
  input: TranslationInput & { db?: Knex }
): Promise<TranslationResult> => {
  const cached = await getCachedTranslation(input);
  if (cached) return cached;

  return translateAndCacheText(input);
};
