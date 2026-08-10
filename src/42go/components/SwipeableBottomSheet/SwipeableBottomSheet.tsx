"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSwipeableDismiss } from "@/42go/components/useSwipeableDismiss";

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
  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  const swipe = useSwipeableDismiss({
    open,
    direction: "bottom",
    surfaceRef: sheetRef,
    onDismiss: dismiss,
    onCloseComplete,
  });

  useImperativeHandle(forwardedRef, () => ({ close: swipe.close }), [swipe.close]);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        swipe.close();
      }}
    >
      <DialogContent
        ref={sheetRef}
        id={id}
        onPointerDownCapture={(event) => swipe.beginDrag(event, "surface")}
        onClickCapture={swipe.onClickCapture}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
        overlayProps={{
          disableExitAnimation: true,
          onPointerDown: (event) => swipe.beginDrag(event, "backdrop"),
          style: swipe.overlayStyle,
        }}
        style={swipe.surfaceStyle}
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
