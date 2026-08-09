"use client";

const storageKey = "lingocafe.conversations.browse-cache.v2";
const maxEntries = 32;
const maxCacheBytes = 512 * 1024;

type BrowseCacheEntry<T = unknown> = {
  etag: string | null;
  payload: T;
  lastUsedAt: number;
};

type BrowseCacheStore = Record<string, BrowseCacheEntry>;

const memoryCache = new Map<string, BrowseCacheEntry>();

const cacheKey = (userId: string, href: string) => `${userId}:${href}`;

const readStore = (): BrowseCacheStore => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as BrowseCacheStore
      : {};
  } catch {
    return {};
  }
};

const storeBytes = (store: BrowseCacheStore) =>
  new TextEncoder().encode(JSON.stringify(store)).length;

const writeStore = (store: BrowseCacheStore) => {
  try {
    const ordered = Object.entries(store).sort(
      ([, a], [, b]) => b.lastUsedAt - a.lastUsedAt
    );
    const next = Object.fromEntries(ordered.slice(0, maxEntries));
    const oldestFirst = Object.entries(next).sort(
      ([, a], [, b]) => a.lastUsedAt - b.lastUsedAt
    );

    while (storeBytes(next) > maxCacheBytes && oldestFirst.length > 0) {
      const oldest = oldestFirst.shift();
      if (oldest) delete next[oldest[0]];
    }

    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Private browsing and storage pressure can disable localStorage. The
    // in-memory cache still keeps navigation fast for the current session.
  }
};

export const readConversationBrowseCache = <T>(userId: string, href: string) => {
  const key = cacheKey(userId, href);
  const memoryEntry = memoryCache.get(key) as BrowseCacheEntry<T> | undefined;
  if (memoryEntry) return memoryEntry;

  const store = readStore();
  const storedEntry = store[key] as BrowseCacheEntry<T> | undefined;
  if (!storedEntry) return null;

  const entry = { ...storedEntry, lastUsedAt: Date.now() };
  memoryCache.set(key, entry);
  return entry;
};

export const writeConversationBrowseCache = <T>({
  userId,
  href,
  etag,
  payload,
}: {
  userId: string;
  href: string;
  etag: string | null;
  payload: T;
}) => {
  const key = cacheKey(userId, href);
  const entry: BrowseCacheEntry<T> = {
    etag,
    payload,
    lastUsedAt: Date.now(),
  };
  memoryCache.set(key, entry);
  const store = readStore();
  store[key] = entry;
  writeStore(store);
};

export const clearConversationBrowseCache = (userId: string) => {
  const prefix = `${userId}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  const store = readStore();
  let changed = false;
  for (const key of Object.keys(store)) {
    if (!key.startsWith(prefix)) continue;
    delete store[key];
    changed = true;
  }
  if (changed) writeStore(store);
};
