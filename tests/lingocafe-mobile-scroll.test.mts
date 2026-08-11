import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  centerReaderElement,
  createDocumentReaderScrollTarget,
  createElementReaderScrollTarget,
  getReaderScrollProgressBps,
  scrollReaderToProgressBps,
} from "../src/app/(app)/(lingocafe)/books/_components/reader-scroll-target.ts";

class FakeHTMLElement extends EventTarget {
  clientHeight = 0;
  scrollHeight = 0;
  scrollTop = 0;
  rect = { top: 0, bottom: 0, height: 0 };
  lastScrollTo: ScrollToOptions | null = null;

  getBoundingClientRect() {
    return this.rect as DOMRect;
  }

  scrollTo(options: ScrollToOptions) {
    this.lastScrollTo = options;
    if (typeof options.top === "number") this.scrollTop = options.top;
  }
}

const originalHTMLElement = globalThis.HTMLElement;

test.before(() => {
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: FakeHTMLElement,
  });
});

test.after(() => {
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: originalHTMLElement,
  });
});

test("element reader targets preserve existing progress and restoration math", () => {
  const element = new FakeHTMLElement();
  element.clientHeight = 500;
  element.scrollHeight = 1500;
  element.scrollTop = 500;
  element.rect = { top: 80, bottom: 580, height: 500 };

  const target = createElementReaderScrollTarget(
    element as unknown as HTMLElement
  );

  assert.equal(getReaderScrollProgressBps(target), 5000);
  assert.equal(scrollReaderToProgressBps(target, 2500), true);
  assert.equal(element.scrollTop, 250);
  assert.deepEqual(target.getViewportRect(), {
    top: 80,
    bottom: 580,
    height: 500,
  });
});

test("document reader targets use root metrics and exclude the sticky header", () => {
  const scrollingElement = new FakeHTMLElement();
  scrollingElement.scrollHeight = 1800;
  scrollingElement.scrollTop = 600;
  const contentRoot = new FakeHTMLElement();
  let lastWindowScroll: ScrollToOptions | null = null;
  const windowTarget = new EventTarget() as EventTarget & {
    innerHeight: number;
    scrollTo: (options: ScrollToOptions) => void;
  };
  windowTarget.innerHeight = 600;
  windowTarget.scrollTo = (options) => {
    lastWindowScroll = options;
    if (typeof options.top === "number") scrollingElement.scrollTop = options.top;
  };

  const target = createDocumentReaderScrollTarget({
    contentRoot: contentRoot as unknown as HTMLElement,
    document: { scrollingElement } as unknown as Document,
    window: windowTarget as unknown as Window,
    topInsetPx: 64,
  });

  assert.ok(target);
  assert.equal(getReaderScrollProgressBps(target), 5000);
  assert.deepEqual(target.getViewportRect(), {
    top: 64,
    bottom: 600,
    height: 536,
  });
  assert.equal(scrollReaderToProgressBps(target, 10000), true);
  assert.equal(scrollingElement.scrollTop, 1200);

  scrollingElement.scrollTop = 600;
  const sentence = new FakeHTMLElement();
  sentence.rect = { top: 300, bottom: 340, height: 40 };
  centerReaderElement(
    target,
    sentence as unknown as HTMLElement,
    "smooth"
  );
  assert.deepEqual(lastWindowScroll, { top: 588, behavior: "smooth" });
});

test("targeted mobile surfaces use document flow while desktop containment remains", async () => {
  const readSource = (path: string) =>
    readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const [
    library,
    conversationReader,
    details,
    reader,
    surfaces,
    modal,
    users,
  ] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell.tsx"
    ),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/(reader)/[conversationId]/page.tsx"
    ),
    readSource("src/app/(app)/(lingocafe)/books/[bookId]/page.tsx"),
    readSource("src/app/(app)/(lingocafe)/books/[bookId]/[pageId]/page.tsx"),
    readSource(
      "src/app/(app)/(lingocafe)/books/_components/BookReaderSurfaces.tsx"
    ),
    readSource("src/42go/components/modal/Modal.tsx"),
    readSource("src/app/(app)/backoffice/users/page.tsx"),
  ]);

  assert.doesNotMatch(library, /containedMobileScroll/);
  assert.match(
    library,
    /min-h-\[calc\(100dvh\+6rem\)\] min-w-0 overflow-x-clip md:min-h-full/
  );
  assert.match(library, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(library, /fade-in-0 slide-in-from-right-4/);
  assert.match(
    library,
    /h-\[max\(30vw,calc\(4rem\+env\(safe-area-inset-bottom\)\)\)\]/
  );
  assert.match(conversationReader, /createDocumentReaderScrollTarget/);
  assert.match(
    conversationReader,
    /if \(!isDesktopReader\) return <>{children}<\/>;/
  );
  assert.match(conversationReader, /md:overflow-y-auto/);
  assert.match(
    conversationReader,
    /preserveDocumentScroll=\{!isDesktopReader\}/
  );
  assert.doesNotMatch(details, /fixed inset-0 z-\[500\]/);
  assert.doesNotMatch(details, /overflow-y-auto/);
  assert.match(reader, /createDocumentReaderScrollTarget/);
  assert.match(reader, /\{!isDesktopReader && readerOverlays\}/);
  assert.match(reader, /\{isDesktopReader && \(\s*<Modal/);
  assert.match(reader, /preserveDocumentScroll=\{!isDesktopReader\}/);
  assert.match(surfaces, /className="sticky top-0 z-30"/);
  assert.doesNotMatch(
    surfaces,
    /reader-mobile"\}\s*ref=\{scrollRef\}[\s\S]*overflow-y-auto/
  );
  assert.match(modal, /focus\(\{ preventScroll: true \}\)/);
  assert.match(modal, /onCloseAutoFocus/);
  assert.match(users, /containedMobileScroll/);
});
