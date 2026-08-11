export type ReaderViewportRect = {
  top: number;
  bottom: number;
  height: number;
};

export type ReaderScrollTarget = {
  kind: "document" | "element";
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
  getScrollTop: () => element.scrollTop,
  getScrollHeight: () => element.scrollHeight,
  getClientHeight: () => element.clientHeight,
  getViewportRect: () => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  },
  setScrollTop: (top) => {
    element.scrollTop = normalizeScrollTop(top);
  },
  scrollTo: (options) => element.scrollTo(options),
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
  const viewport = target.getViewportRect();
  return elementRect.bottom > viewport.top && elementRect.top < viewport.bottom;
};
