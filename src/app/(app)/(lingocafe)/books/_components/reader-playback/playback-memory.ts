const READER_PLAYBACK_MEMORY_STORAGE_KEY =
  "lingocafe.reader.playback-memory.v1";
const MAX_STORED_PAGES = 200;

type ReaderPlaybackMemoryEntry = {
  sentenceId: string;
  updatedAt: number;
};

type ReaderPlaybackMemoryStore = Record<string, ReaderPlaybackMemoryEntry>;

const getPageKey = (bookId: string, pageId: string) => `${bookId}:${pageId}`;

const readStore = (): ReaderPlaybackMemoryStore => {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      localStorage.getItem(READER_PLAYBACK_MEMORY_STORAGE_KEY) || "{}"
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<ReaderPlaybackMemoryStore>(
      (store, [pageKey, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return store;
        }
        const entry = value as Partial<ReaderPlaybackMemoryEntry>;
        if (
          typeof entry.sentenceId !== "string" ||
          !entry.sentenceId ||
          typeof entry.updatedAt !== "number" ||
          !Number.isFinite(entry.updatedAt)
        ) {
          return store;
        }
        store[pageKey] = {
          sentenceId: entry.sentenceId,
          updatedAt: entry.updatedAt,
        };
        return store;
      },
      {}
    );
  } catch {
    return {};
  }
};

export const readLastPlayedSentenceId = (bookId: string, pageId: string) =>
  readStore()[getPageKey(bookId, pageId)]?.sentenceId ?? null;

export const storeLastPlayedSentenceId = (
  bookId: string,
  pageId: string,
  sentenceId: string
) => {
  if (typeof window === "undefined") return;

  try {
    const pageKey = getPageKey(bookId, pageId);
    const entries = Object.entries({
      ...readStore(),
      [pageKey]: { sentenceId, updatedAt: Date.now() },
    })
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_STORED_PAGES);

    localStorage.setItem(
      READER_PLAYBACK_MEMORY_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch (error) {
    console.warn("Could not save reader playback position.", error);
  }
};
