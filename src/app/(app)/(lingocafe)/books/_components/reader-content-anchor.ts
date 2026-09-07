import type { ReaderScrollTarget } from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-target";

export type ReaderContentAnchor = {
  sentenceId: string;
  text: string;
  offset: number;
  atStart: boolean;
};

export const isReaderContentAnchor = (value: unknown): value is ReaderContentAnchor => {
  if (!value || typeof value !== "object") return false;
  const anchor = value as ReaderContentAnchor;
  return typeof anchor.sentenceId === "string" && typeof anchor.text === "string" &&
    Number.isInteger(anchor.offset) && anchor.offset >= 0 && anchor.offset <= anchor.text.length &&
    typeof anchor.atStart === "boolean";
};

const characterRange = (element: Element, offset: number) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (remaining < length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.setEnd(node, remaining + 1);
      return range;
    }
    remaining -= length;
  }
  return null;
};

export const captureReaderContentAnchor = (target: ReaderScrollTarget): ReaderContentAnchor | null => {
  const viewport = target.contentRoot.getBoundingClientRect();
  const vertical = target.getViewportRect();
  const visible = (rect: DOMRect) => rect.width > 0 && rect.height > 0 &&
    rect.right > viewport.left + 1 && rect.left < viewport.right - 1 &&
    rect.bottom > vertical.top + 1 && rect.top < vertical.bottom - 1;
  for (const element of target.contentRoot.querySelectorAll<HTMLElement>("[data-reader-sentence-id]")) {
    if (!Array.from(element.getClientRects()).some(visible)) continue;
    const text = element.textContent ?? "";
    // Walk text nodes, then binary-search the first visible character. This
    // also handles a sentence split across two columns without storing a page.
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let offset = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent?.length ?? 0;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (length && Array.from(range.getClientRects()).some(visible)) {
        let low = 0;
        let high = length - 1;
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          range.setStart(node, mid);
          range.setEnd(node, mid + 1);
          const rect = range.getBoundingClientRect();
          const before = target.axis === "horizontal"
            ? rect.right <= viewport.left + 1
            : rect.bottom <= vertical.top + 1;
          if (before) low = mid + 1;
          else high = mid;
        }
        return { sentenceId: element.dataset.readerSentenceId!, text, offset: offset + low, atStart: target.getScrollTop() <= 1 };
      }
      offset += length;
    }
  }
  return null;
};

export const restoreReaderContentAnchor = (target: ReaderScrollTarget, anchor: ReaderContentAnchor) => {
  const element = Array.from(target.contentRoot.querySelectorAll<HTMLElement>("[data-reader-sentence-id]"))
    .find((candidate) => candidate.dataset.readerSentenceId === anchor.sentenceId);
  if (!element || element.textContent !== anchor.text) return false;
  if (anchor.atStart) {
    target.setScrollTop(0);
    return true;
  }
  const range = characterRange(element, anchor.offset);
  if (!range) return false;
  const rect = range.getBoundingClientRect();
  const viewport = target.contentRoot.getBoundingClientRect();
  const offset = target.axis === "horizontal"
    ? rect.left - viewport.left
    : rect.top - target.getViewportRect().top;
  const position = target.getScrollTop() + offset;
  target.setScrollTop(target.axis === "horizontal"
    ? Math.floor((position + 1) / target.getClientHeight()) * target.getClientHeight()
    : position);
  return true;
};
