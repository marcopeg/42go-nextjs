"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

const DISMISS_DISTANCE = 300;
const MOTION_DURATION = 240;
const REDUCED_MOTION_DURATION = 180;
const SWIPE_EDGE_SIZE = 32;

export type SwipeDismissDirection = "top" | "right" | "bottom" | "left";
export type SwipeDismissSource = "backdrop" | "surface";

type UseSwipeableDismissOptions = {
  enabled?: boolean;
  open: boolean;
  direction: SwipeDismissDirection;
  startFromEdge?: boolean;
  surfaceRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  onCloseComplete?: () => void;
};

const isHorizontalDirection = (direction: SwipeDismissDirection) =>
  direction === "left" || direction === "right";

const directionSign = (direction: SwipeDismissDirection) =>
  direction === "left" || direction === "top" ? -1 : 1;

export const useSwipeableDismiss = ({
  enabled = true,
  open,
  direction,
  startFromEdge = false,
  surfaceRef,
  onDismiss,
  onCloseComplete,
}: UseSwipeableDismissOptions) => {
  const dragRef = useRef<{
    pointerId: number;
    source: SwipeDismissSource;
    startPosition: number;
    lastPosition: number;
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
  const [activeMotionDuration, setActiveMotionDuration] =
    useState(MOTION_DURATION);

  const horizontal = isHorizontalDirection(direction);
  const sign = directionSign(direction);
  const getPosition = useCallback(
    (event: Pick<PointerEvent, "clientX" | "clientY">) =>
      horizontal ? event.clientX : event.clientY,
    [horizontal]
  );

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

  const motionDuration = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? REDUCED_MOTION_DURATION
      : MOTION_DURATION;

  const animateTo = useCallback(
    (offset: number, onComplete?: () => void) => {
      clearAnimationFrame();
      clearTimer(settleTimerRef);
      const duration = motionDuration();

      flushSync(() => {
        setActiveMotionDuration(duration);
        setSettling(true);
      });
      void surfaceRef.current?.getBoundingClientRect();
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
    },
    [surfaceRef]
  );

  const close = useCallback(() => {
    if (!enabled || closingRef.current) return;
    closingRef.current = true;
    clearTimer(animationTimerRef);
    const surfaceDistance = horizontal
      ? surfaceRef.current?.offsetWidth ?? window.innerWidth
      : surfaceRef.current?.offsetHeight ?? window.innerHeight;

    animateTo(Math.max(surfaceDistance + 24, DISMISS_DISTANCE), () => {
      onDismiss();
      onCloseComplete?.();
      animationTimerRef.current = window.setTimeout(() => {
        setDragOffset(0);
        setSettling(false);
        closingRef.current = false;
        animationTimerRef.current = null;
      }, 32);
    });
  }, [animateTo, enabled, horizontal, onCloseComplete, onDismiss, surfaceRef]);

  const settleOpen = useCallback(() => {
    animateTo(0, () => {
      closingRef.current = false;
    });
  }, [animateTo]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const position = getPosition(event);
      const offset = Math.max(0, (position - drag.startPosition) * sign);
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      drag.velocity = ((position - drag.lastPosition) * sign) / elapsed;
      drag.lastPosition = position;
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
      const distance = Math.max(
        0,
        (getPosition(event) - drag.startPosition) * sign
      );
      const surfaceSize = horizontal
        ? surfaceRef.current?.offsetWidth ?? 400
        : surfaceRef.current?.offsetHeight ?? 400;
      const passedDistance = distance >= Math.min(160, surfaceSize * 0.32);
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
  }, [close, enabled, getPosition, horizontal, settleOpen, sign, surfaceRef]);

  useEffect(
    () => () => {
      clearAnimationFrame();
      clearTimer(animationTimerRef);
      clearTimer(settleTimerRef);
    },
    []
  );

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    source: SwipeDismissSource
  ) => {
    if (!enabled || !open || !event.isPrimary || closingRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (startFromEdge && source === "surface") {
      const bounds = surfaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const startsAtDismissEdge = direction === "right"
        ? event.clientX <= bounds.left + SWIPE_EDGE_SIZE
        : direction === "left"
          ? event.clientX >= bounds.right - SWIPE_EDGE_SIZE
          : direction === "bottom"
            ? event.clientY <= bounds.top + SWIPE_EDGE_SIZE
            : event.clientY >= bounds.bottom - SWIPE_EDGE_SIZE;
      if (!startsAtDismissEdge) return;
    }
    clearAnimationFrame();
    clearTimer(settleTimerRef);
    setSettling(false);
    const position = horizontal ? event.clientX : event.clientY;
    dragRef.current = {
      pointerId: event.pointerId,
      source,
      startPosition: position,
      lastPosition: position,
      lastTime: event.timeStamp,
      velocity: 0,
      dragged: false,
    };
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const translatedOffset = dragOffset * sign;
  const surfaceStyle: CSSProperties = {
    transform: horizontal
      ? `translate3d(${translatedOffset}px, 0, 0)`
      : `translate3d(0, ${translatedOffset}px, 0)`,
    transition: settling
      ? `transform ${activeMotionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : "none",
    touchAction: horizontal ? "pan-y" : "none",
  };
  const overlayStyle: CSSProperties = {
    opacity: Math.max(0, 1 - dragOffset / DISMISS_DISTANCE),
    touchAction: "none",
    transition: settling
      ? `opacity ${activeMotionDuration}ms ease-out`
      : "none",
  };

  return {
    beginDrag,
    close,
    onClickCapture,
    overlayStyle,
    surfaceStyle,
  };
};
