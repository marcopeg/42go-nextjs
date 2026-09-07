import { captureReaderContentAnchor, isReaderContentAnchor, restoreReaderContentAnchor, type ReaderContentAnchor } from "./reader-content-anchor.ts";
import type { ReaderScrollTarget } from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-target";

export type ReaderScrollSurface = "desktop" | "mobile";

export type ReaderScrollMemory = {
  anchor?: ReaderContentAnchor | null;
  axis?: "horizontal" | "vertical";
  savedAt?: number;
  scrollTop: number;
  contentWidth: number;
  progressBps: number;
};

type ReaderScrollMemoryStore = Record<
  string,
  Partial<Record<ReaderScrollSurface, ReaderScrollMemory>>
>;

export const READER_SCROLL_MEMORY_STORAGE_KEY =
  "lingocafe:reader-scroll-positions:v1";

const READER_SCROLL_WIDTH_TOLERANCE_PX = 1;
const READER_SCROLL_TOP_TOLERANCE_PX = 1;

export const READER_SCROLL_READY_SELECTOR =
  '[data-reader-scroll-ready="true"]';

export const getBookPageScrollMemoryKey = (
  bookId: string,
  pageId: string
) => `book:${bookId}:${pageId}`;

export const getConversationScrollMemoryKey = (conversationId: string) =>
  `conversation:${conversationId}`;

const isReaderScrollMemory = (value: unknown): value is ReaderScrollMemory => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const memory = value as Partial<ReaderScrollMemory>;

  return (
    typeof memory.scrollTop === "number" &&
    Number.isFinite(memory.scrollTop) &&
    memory.scrollTop >= 0 &&
    typeof memory.contentWidth === "number" &&
    Number.isFinite(memory.contentWidth) &&
    memory.contentWidth >= 0 &&
    typeof memory.progressBps === "number" &&
    Number.isFinite(memory.progressBps) &&
    memory.progressBps >= 0 &&
    memory.progressBps <= 10000
  );
};

let sessionStore: ReaderScrollMemoryStore = {};

const readStore = (): ReaderScrollMemoryStore => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(
      READER_SCROLL_MEMORY_STORAGE_KEY
    );
    if (!raw) return sessionStore;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const persisted = Object.fromEntries(
      Object.entries(parsed).flatMap(([contentKey, surfaces]) => {
        if (!surfaces || typeof surfaces !== "object" || Array.isArray(surfaces)) {
          return [];
        }
        const rawSurfaces = surfaces as Record<string, unknown>;
        const memory: Partial<
          Record<ReaderScrollSurface, ReaderScrollMemory>
        > = {};
        if (isReaderScrollMemory(rawSurfaces.mobile)) {
          memory.mobile = rawSurfaces.mobile;
        }
        if (isReaderScrollMemory(rawSurfaces.desktop)) {
          memory.desktop = rawSurfaces.desktop;
        }
        return memory.mobile || memory.desktop ? [[contentKey, memory]] : [];
      })
    );
    return { ...persisted, ...sessionStore };
  } catch {
    return sessionStore;
  }
};

export const readReaderScrollMemory = (
  contentKey: string,
  surface: ReaderScrollSurface
): ReaderScrollMemory | null => {
  const memories = readStore()[contentKey];
  if (!memories) return null;
  const latest = Object.values(memories).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];
  return latest?.anchor ? latest : memories[surface] ?? null;
};

export const writeReaderScrollMemory = (
  contentKey: string,
  surface: ReaderScrollSurface,
  target: ReaderScrollTarget,
  progressBps: number
) => {
  if (typeof window === "undefined") return;

  const store = readStore();
  store[contentKey] = {
    ...store[contentKey],
    [surface]: {
      ...(contentKey.startsWith("book:") ? {
        anchor: captureReaderContentAnchor(target), axis: target.axis ?? "vertical", savedAt: Date.now(),
      } : {}),
      scrollTop: target.getScrollTop(),
      contentWidth: target.contentRoot.clientWidth,
      progressBps,
    },
  };

  sessionStore = store;
  try {
    window.localStorage.setItem(
      READER_SCROLL_MEMORY_STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch {
    // The API percentage remains the fallback when storage is unavailable.
  }
};

export const restoreReaderScrollMemory = (
  target: ReaderScrollTarget,
  memory: ReaderScrollMemory
) => {
  if (isReaderContentAnchor(memory.anchor)) {
    return restoreReaderContentAnchor(target, memory.anchor);
  }
  if ((memory.axis ?? "vertical") !== (target.axis ?? "vertical")) return false;
  if (
    Math.abs(target.contentRoot.clientWidth - memory.contentWidth) >
    READER_SCROLL_WIDTH_TOLERANCE_PX
  ) {
    return false;
  }

  const maxScrollTop = Math.max(
    0,
    target.getScrollHeight() - target.getClientHeight()
  );
  if (memory.scrollTop > maxScrollTop + READER_SCROLL_TOP_TOLERANCE_PX) {
    return false;
  }

  target.setScrollTop(memory.scrollTop);
  return (
    Math.abs(target.getScrollTop() - memory.scrollTop) <=
    READER_SCROLL_TOP_TOLERANCE_PX
  );
};
