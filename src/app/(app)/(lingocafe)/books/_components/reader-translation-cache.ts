"use client";

export type ReaderTranslationCacheSource =
  | "client"
  | "memory"
  | "database"
  | "google";

export type ReaderTranslationCacheEntry = {
  hash: string;
  from: string;
  to: string;
  text: string;
  translation: string;
  source: ReaderTranslationCacheSource;
  lastUsedAt: number;
};

export type ReaderTranslationHashInput = {
  text: string;
  from: string;
  to: string;
};

const storageKey = "lingocafe.reader.translation-cache.v1";
const maxCacheBytes = 1024 * 1024;

export const normalizeReaderTranslationText = (text: string) =>
  text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const normalizeReaderTranslationLanguage = (lang: string) =>
  lang.normalize("NFKC").trim().toLocaleLowerCase();

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const getReaderTranslationHash = async ({
  text,
  from,
  to,
}: ReaderTranslationHashInput) => {
  const payload = JSON.stringify({
    text: normalizeReaderTranslationText(text),
    from: normalizeReaderTranslationLanguage(from),
    to: normalizeReaderTranslationLanguage(to),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );

  return toHex(digest);
};

const readStore = () => {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return {};
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return parsed as Record<string, ReaderTranslationCacheEntry>;
  } catch {
    return {};
  }
};

const getStoreBytes = (store: Record<string, ReaderTranslationCacheEntry>) =>
  new TextEncoder().encode(JSON.stringify(store)).length;

const writeStore = (store: Record<string, ReaderTranslationCacheEntry>) => {
  const entries = Object.values(store).sort(
    (a, b) => a.lastUsedAt - b.lastUsedAt
  );

  while (getStoreBytes(store) > maxCacheBytes && entries.length > 0) {
    const oldest = entries.shift();
    if (!oldest) break;
    delete store[oldest.hash];
  }

  if (Object.keys(store).length === 0) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(store));
};

export const readCachedReaderTranslation = async (
  input: ReaderTranslationHashInput
) => {
  const hash = await getReaderTranslationHash(input);
  const store = readStore();
  const entry = store[hash];

  if (!entry) return null;

  const nextEntry = {
    ...entry,
    source: "client" as const,
    lastUsedAt: Date.now(),
  };
  store[hash] = nextEntry;
  writeStore(store);

  return nextEntry;
};

export const writeCachedReaderTranslation = (
  entry: Omit<ReaderTranslationCacheEntry, "lastUsedAt">
) => {
  const store = readStore();
  store[entry.hash] = {
    ...entry,
    lastUsedAt: Date.now(),
  };
  writeStore(store);
};
