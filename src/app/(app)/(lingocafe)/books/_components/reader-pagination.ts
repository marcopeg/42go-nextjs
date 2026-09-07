// CSS columns are anonymous boxes: movement uses the measured column pitch,
// rather than treating paragraphs (or generated DOM clones) as pages.
export const getPaginationGeometry = (width: number, scrollWidth: number) => {
  const pitch = Math.max(1, width);
  const count = Math.max(1, Math.ceil((scrollWidth - 1) / pitch));
  return { pitch, count, max: (count - 1) * pitch };
};

export const snapReaderOffset = (offset: number, pitch: number, max: number) =>
  Math.min(max, Math.max(0, Math.round(offset / pitch) * pitch));

export const isPaginatedReader = (element: HTMLElement) =>
  element.dataset.readerPaginated === "true";

export const getReaderPagination = (element: HTMLElement) =>
  getPaginationGeometry(element.clientWidth, element.scrollWidth);

export const getVisibleReaderRect = (element: Element, viewport: DOMRect) =>
  Array.from(element.getClientRects()).find(
    (rect) => rect.width > 0 && rect.height > 0 &&
      rect.right > viewport.left + 1 && rect.left < viewport.right - 1 &&
      rect.bottom > viewport.top + 1 && rect.top < viewport.bottom - 1
  );

// Percentage heights inside nested flex layouts can remain indefinite. Give
// the multicol element a definite block size before measuring its overflow.
export const sizeReaderColumns = (element: HTMLElement) => {
  const article = element.querySelector<HTMLElement>(":scope > article");
  if (!article) return;
  if (!isPaginatedReader(element)) {
    article.style.removeProperty("height");
    article.style.removeProperty("column-width");
    return;
  }
  if (element.clientWidth > 0) {
    const width = `${element.clientWidth}px`;
    if (article.style.columnWidth !== width) article.style.columnWidth = width;
  }
  if (element.clientHeight > 0) {
    const height = `${element.clientHeight}px`;
    if (article.style.height !== height) article.style.height = height;
  }
};
