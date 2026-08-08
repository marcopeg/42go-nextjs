"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DISMISS_DISTANCE = 300;
const MOTION_DURATION = 240;
const REDUCED_MOTION_DURATION = 180;

export type SwipeableBottomSheetHandle = {
  close: () => void;
};

export type SwipeableBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  onCloseComplete?: () => void;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
};

export const SwipeableBottomSheet = forwardRef<
  SwipeableBottomSheetHandle,
  SwipeableBottomSheetProps
>(({
  open,
  onOpenChange,
  title,
  children,
  id,
  className,
  onCloseComplete,
  onCloseAutoFocus,
}, forwardedRef) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    source: "backdrop" | "sheet";
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    dragged: boolean;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [activeMotionDuration, setActiveMotionDuration] = useState(MOTION_DURATION);

  const clearAnimationFrame = () => {
    if (animationFrameRef.current === null) return;
    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  };

  const clearTimer = (timerRef: typeof animationTimerRef) => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const motionDuration = () => (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? REDUCED_MOTION_DURATION
      : MOTION_DURATION
  );

  const animateTo = useCallback((offset: number, onComplete?: () => void) => {
    clearAnimationFrame();
    clearTimer(settleTimerRef);
    const duration = motionDuration();

    // Commit the transition before changing its target. Without this boundary,
    // React may batch both updates into one paint and the sheet disappears.
    flushSync(() => {
      setActiveMotionDuration(duration);
      setSettling(true);
    });
    void sheetRef.current?.getBoundingClientRect();
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setDragOffset(offset);
        animationFrameRef.current = null;
        settleTimerRef.current = window.setTimeout(() => {
          setSettling(false);
          settleTimerRef.current = null;
          onComplete?.();
        }, duration);
      });
    });
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimer(animationTimerRef);
    const sheetDistance = (sheetRef.current?.offsetHeight ?? window.innerHeight) + 24;

    animateTo(Math.max(sheetDistance, DISMISS_DISTANCE), () => {
      onOpenChange(false);
      onCloseComplete?.();
      animationTimerRef.current = window.setTimeout(() => {
        setDragOffset(0);
        setSettling(false);
        closingRef.current = false;
        animationTimerRef.current = null;
      }, 32);
    });
  }, [animateTo, onCloseComplete, onOpenChange]);

  const settleOpen = useCallback(() => {
    animateTo(0, () => {
      closingRef.current = false;
    });
  }, [animateTo]);

  useImperativeHandle(forwardedRef, () => ({ close }), [close]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const offset = Math.max(0, event.clientY - drag.startY);
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      drag.velocity = (event.clientY - drag.lastY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
      if (offset > 6) {
        drag.dragged = true;
        suppressClickRef.current = true;
        event.preventDefault();
      }
      setDragOffset(offset);
    };

    const finishDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      const distance = Math.max(0, event.clientY - drag.startY);
      const sheetHeight = sheetRef.current?.offsetHeight ?? 400;
      const passedDistance = distance >= Math.min(160, sheetHeight * 0.32);
      const passedVelocity = distance >= 24 && drag.velocity >= 0.65;

      if (!drag.dragged && drag.source === "backdrop") {
        close();
      } else if (passedDistance || passedVelocity) {
        close();
      } else {
        settleOpen();
      }

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    const cancelDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      settleOpen();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
    };
  }, [close, settleOpen]);

  useEffect(() => () => {
    clearAnimationFrame();
    clearTimer(animationTimerRef);
    clearTimer(settleTimerRef);
  }, []);

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    source: "backdrop" | "sheet"
  ) => {
    if (!open || !event.isPrimary || closingRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearAnimationFrame();
    clearTimer(settleTimerRef);
    setSettling(false);
    dragRef.current = {
      pointerId: event.pointerId,
      source,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      dragged: false,
    };
  };

  const backdropOpacity = Math.max(0, 1 - dragOffset / DISMISS_DISTANCE);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        close();
      }}
    >
      <DialogContent
        ref={sheetRef}
        id={id}
        onPointerDownCapture={(event) => beginDrag(event, "sheet")}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
        overlayProps={{
          disableExitAnimation: true,
          onPointerDown: (event) => beginDrag(event, "backdrop"),
          style: {
            opacity: backdropOpacity,
            touchAction: "none",
            transition: settling ? `opacity ${activeMotionDuration}ms ease-out` : "none",
          },
        }}
        style={{
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          transition: settling
            ? `transform ${activeMotionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
          touchAction: "none",
        }}
        className={cn(
          "inset-x-2.5 bottom-0 max-h-[85dvh] w-auto overflow-hidden rounded-t-3xl border bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 will-change-transform data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 data-[state=open]:ease-out",
          className
        )}
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <div className="px-1 pb-4">
          <DialogTitle className="text-xl leading-tight">{title}</DialogTitle>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
});

SwipeableBottomSheet.displayName = "SwipeableBottomSheet";
