import { getReaderPagination, getVisibleReaderRect, isPaginatedReader, snapReaderOffset } from "./reader-pagination.ts";

export type ReaderViewportRect = {
  top: number;
  bottom: number;
  height: number;
};

export type ReaderScrollTarget = {
  kind: "document" | "element";
  axis?: "vertical" | "horizontal";
  contentRoot: HTMLElement;
  getScrollTop: () => number;
  getScrollHeight: () => number;
  getClientHeight: () => number;
  getViewportRect: () => ReaderViewportRect;
  setScrollTop: (top: number) => void;
  scrollTo: (options: ScrollToOptions) => void;
  addScrollListener: (listener: EventListener) => () => void;
};

type DocumentReaderScrollTargetInput = {
  contentRoot: HTMLElement;
  document: Document;
  window: Window;
  topInsetPx?: number;
};

const normalizeScrollTop = (top: number) => Math.max(0, top);

export const createElementReaderScrollTarget = (
  element: HTMLElement
): ReaderScrollTarget => ({
  kind: "element",
  contentRoot: element,
  get axis() { return isPaginatedReader(element) ? "horizontal" : "vertical"; },
  getScrollTop: () => isPaginatedReader(element) ? element.scrollLeft : element.scrollTop,
  getScrollHeight: () => isPaginatedReader(element) ? getReaderPagination(element).max + element.clientWidth : element.scrollHeight,
  getClientHeight: () => isPaginatedReader(element) ? element.clientWidth : element.clientHeight,
  getViewportRect: () => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  },
  setScrollTop: (top) => {
    if (isPaginatedReader(element)) {
      const { pitch, max } = getReaderPagination(element);
      element.scrollLeft = snapReaderOffset(top, pitch, max);
    } else element.scrollTop = normalizeScrollTop(top);
  },
  scrollTo: (options) => {
    if (isPaginatedReader(element)) {
      const { pitch, max } = getReaderPagination(element);
      element.scrollTo({ left: snapReaderOffset(options.top ?? 0, pitch, max), behavior: "instant" });
    } else element.scrollTo(options);
  },
  addScrollListener: (listener) => {
    element.addEventListener("scroll", listener, { passive: true });
    return () => element.removeEventListener("scroll", listener);
  },
});

export const createDocumentReaderScrollTarget = ({
  contentRoot,
  document: ownerDocument,
  window: ownerWindow,
  topInsetPx = 0,
}: DocumentReaderScrollTargetInput): ReaderScrollTarget | null => {
  const scrollingElement = ownerDocument.scrollingElement;
  if (!(scrollingElement instanceof HTMLElement)) return null;

  return {
    kind: "document",
    contentRoot,
    getScrollTop: () => scrollingElement.scrollTop,
    getScrollHeight: () => scrollingElement.scrollHeight,
    getClientHeight: () => ownerWindow.innerHeight,
    getViewportRect: () => {
      const top = Math.max(0, topInsetPx);
      const bottom = Math.max(top, ownerWindow.innerHeight);
      return { top, bottom, height: bottom - top };
    },
    setScrollTop: (top) => {
      scrollingElement.scrollTop = normalizeScrollTop(top);
    },
    scrollTo: (options) => ownerWindow.scrollTo(options),
    addScrollListener: (listener) => {
      ownerWindow.addEventListener("scroll", listener, { passive: true });
      return () => ownerWindow.removeEventListener("scroll", listener);
    },
  };
};

export const getReaderScrollProgressBps = (target: ReaderScrollTarget) => {
  const scrollable = target.getScrollHeight() - target.getClientHeight();
  if (scrollable <= 0) return 0;
  return Math.min(
    10000,
    Math.max(0, Math.round((target.getScrollTop() / scrollable) * 10000))
  );
};

export const scrollReaderToProgressBps = (
  target: ReaderScrollTarget,
  progressBps: number
) => {
  const scrollable = target.getScrollHeight() - target.getClientHeight();
  if (scrollable <= 0) {
    if (progressBps === 0) {
      target.setScrollTop(0);
      return true;
    }
    return false;
  }

  const boundedProgress = Math.min(10000, Math.max(0, progressBps));
  target.setScrollTop((scrollable * boundedProgress) / 10000);
  return true;
};

export const centerReaderElement = (
  target: ReaderScrollTarget,
  element: HTMLElement,
  behavior: ScrollBehavior = "auto"
) => {
  if (target.axis === "horizontal") {
    const viewport = target.contentRoot.getBoundingClientRect();
    if (getVisibleReaderRect(element, viewport)) return;
    const rect = element.getClientRects()[0];
    if (rect) {
      const position = target.getScrollTop() + rect.left - viewport.left;
      target.setScrollTop(Math.floor((position + 1) / target.getClientHeight()) * target.getClientHeight());
    }
    return;
  }
  const viewport = target.getViewportRect();
  const elementRect = element.getBoundingClientRect();
  const top =
    target.getScrollTop() +
    (elementRect.top - viewport.top) -
    (viewport.height - elementRect.height) / 2;

  target.scrollTo({ top: normalizeScrollTop(top), behavior });
};

export const isReaderElementVisible = (
  target: ReaderScrollTarget,
  element: HTMLElement
) => {
  const elementRect = element.getBoundingClientRect();
  if (target.axis === "horizontal") {
    return Boolean(getVisibleReaderRect(element, target.contentRoot.getBoundingClientRect()));
  }
  const viewport = target.getViewportRect();
  return elementRect.bottom > viewport.top && elementRect.top < viewport.bottom;
};
