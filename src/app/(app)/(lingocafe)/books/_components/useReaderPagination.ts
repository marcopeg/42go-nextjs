"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { captureReaderContentAnchor, restoreReaderContentAnchor } from "@/app/(app)/(lingocafe)/books/_components/reader-content-anchor";
import { createElementReaderScrollTarget } from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-target";
import { getReaderPagination, sizeReaderColumns, snapReaderOffset } from "@/app/(app)/(lingocafe)/books/_components/reader-pagination";

const hasSelection = () => Boolean(window.getSelection()?.toString().trim());

export const useReaderPagination = ({
  scrollRef, enabled, contentKey, pending, previousHref, nextHref, onNavigatePage,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  contentKey: string;
  pending: boolean;
  previousHref?: string;
  nextHref?: string;
  onNavigatePage: (href: string, entryProgress?: number) => void;
}) => {
  const wheelGesture = useRef({ last: 0, sum: 0, turned: false });
  const [position, setPosition] = useState({ index: 0, last: 0 });
  const turn = useCallback((direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!enabled || pending || !element || !element.clientWidth || hasSelection()) return;
    sizeReaderColumns(element);
    element.dispatchEvent(new Event("reader-page-turn"));
    const { pitch, max } = getReaderPagination(element);
    const current = snapReaderOffset(element.scrollLeft, pitch, max);
    const next = current + direction * pitch;
    if (next >= 0 && next <= max) {
      element.scrollTo({ left: next, behavior: "instant" });
    } else {
      const href = direction > 0 ? nextHref : previousHref;
      if (!href) return;
      onNavigatePage(href, direction > 0 ? 0 : 10000);
    }
  }, [enabled, nextHref, onNavigatePage, pending, previousHref, scrollRef]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    sizeReaderColumns(element);
    const target = createElementReaderScrollTarget(element);
    let anchor = captureReaderContentAnchor(target);
    let oldWidth = element.clientWidth;
    let oldHeight = element.clientHeight;
    let frame = 0;
    let disposed = false;
    let contentReflow = false;
    const sync = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      // Browser reflow can emit scroll before ResizeObserver. Keep the anchor
      // from the old layout until resize has restored it in the new layout.
      if (contentReflow || document.fonts.status === "loading" ||
        oldWidth !== element.clientWidth || oldHeight !== element.clientHeight) return;
      if (enabled) {
        const { pitch, count } = getReaderPagination(element);
        const index = Math.round(element.scrollLeft / pitch);
        setPosition((current) => current.index === index && current.last === count - 1
          ? current : { index, last: count - 1 });
      }
      anchor = captureReaderContentAnchor(target);
    };
    const resize = () => {
      if (!element.clientWidth || !element.clientHeight) {
        // The active surface restores the newest shared anchor at breakpoints.
        anchor = null;
        oldWidth = 0;
        oldHeight = 0;
        return;
      }
      const changed = oldWidth !== element.clientWidth || oldHeight !== element.clientHeight;
      oldWidth = element.clientWidth;
      oldHeight = element.clientHeight;
      sizeReaderColumns(element);
      if ((changed || contentReflow) && anchor) restoreReaderContentAnchor(target, anchor);
      contentReflow = false;
      sync();
      // Notify existing chapter-progress consumers even if reflow didn't emit scroll.
      element.dispatchEvent(new Event("scroll"));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    const scheduleContentReflow = () => {
      contentReflow = true;
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    const article = element.querySelector("article");
    if (article) observer.observe(article);
    element.addEventListener("scroll", sync);
    element.addEventListener("load", scheduleContentReflow, true);
    document.fonts.addEventListener("loadingdone", scheduleContentReflow);
    document.fonts.addEventListener("loadingerror", scheduleContentReflow);
    void document.fonts.ready.then(() => { if (!disposed) scheduleContentReflow(); });
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("scroll", sync);
      element.removeEventListener("load", scheduleContentReflow, true);
      document.fonts.removeEventListener("loadingdone", scheduleContentReflow);
      document.fonts.removeEventListener("loadingerror", scheduleContentReflow);
    };
  }, [contentKey, enabled, scrollRef]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!enabled || !element) return;
    let start: { x: number; y: number } | null = null;
    const gesture = wheelGesture.current;
    const touchStart = (event: TouchEvent) => {
      start = event.touches.length === 1 && !hasSelection()
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    };
    const touchEnd = (event: TouchEvent) => {
      const from = start;
      start = null;
      if (!from || hasSelection()) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const x = touch.clientX - from.x;
      const y = touch.clientY - from.y;
      if (Math.abs(x) >= 48 && Math.abs(x) > Math.abs(y) * 1.5) turn(x < 0 ? 1 : -1);
    };
    const touchCancel = () => { start = null; };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || hasSelection()) return;
      event.preventDefault();
      const now = performance.now();
      if (now - gesture.last > 180) { gesture.sum = 0; gesture.turned = false; }
      gesture.last = now;
      if (gesture.turned) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      gesture.sum += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      if (Math.abs(gesture.sum) >= 40) { gesture.turned = true; turn(gesture.sum > 0 ? 1 : -1); }
    };
    const focusIn = (event: FocusEvent) => {
      const focused = event.target;
      if (!(focused instanceof HTMLElement) || focused === element) return;
      const rect = focused.getClientRects()[0];
      if (!rect) return;
      const position = element.scrollLeft + rect.left - element.getBoundingClientRect().left;
      element.scrollLeft = Math.floor((position + 1) / element.clientWidth) * element.clientWidth;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!element.clientWidth || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || hasSelection()) return;
      const focused = event.target instanceof Element ? event.target : null;
      if (focused?.closest("input,textarea,select,[contenteditable=true],[data-reader-translation-popover]")) return;
      if (focused?.closest('[role="dialog"]') !== element.closest('[role="dialog"]')) return;
      const direction = event.key === "ArrowRight" || event.key === "PageDown" ? 1
        : event.key === "ArrowLeft" || event.key === "PageUp" ? -1 : null;
      if (!direction) return;
      event.preventDefault();
      if (!event.repeat) turn(direction);
    };
    element.addEventListener("focusin", focusIn);
    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchend", touchEnd, { passive: true });
    element.addEventListener("touchcancel", touchCancel);
    element.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("keydown", keyDown);
    return () => {
      element.removeEventListener("focusin", focusIn);
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchend", touchEnd);
      element.removeEventListener("touchcancel", touchCancel);
      element.removeEventListener("wheel", wheel);
      document.removeEventListener("keydown", keyDown);
    };
  }, [enabled, scrollRef, turn]);

  return {
    turn,
    canPrevious: !pending && (position.index > 0 || Boolean(previousHref)),
    canNext: !pending && (position.index < position.last || Boolean(nextHref)),
    atEnd: position.index === position.last,
  };
};
