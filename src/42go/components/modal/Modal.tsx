"use client";

import { X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/42go/utils/utils";
import type { ModalAnchor, ModalProps, ModalSize } from "./types";

const modalSizeClasses: Record<ModalSize, string> = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-2xl",
  xl: "md:max-w-4xl",
  full: "md:max-w-[calc(100vw-4rem)]",
};

const panelSideSizeClasses: Record<ModalSize, string> = {
  sm: "md:w-[320px]",
  md: "md:w-[420px]",
  lg: "md:w-[560px]",
  xl: "md:w-[720px]",
  full: "md:w-[calc(100vw-4rem)]",
};

const panelStackSizeClasses: Record<ModalSize, string> = {
  sm: "md:h-[240px]",
  md: "md:h-[320px]",
  lg: "md:h-[420px]",
  xl: "md:h-[560px]",
  full: "md:h-[calc(100vh-4rem)]",
};

const panelAnchorClasses: Record<ModalAnchor, string> = {
  right:
    "md:inset-y-0 md:left-auto md:right-0 md:h-screen md:border-l md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right",
  left: "md:inset-y-0 md:left-0 md:right-auto md:h-screen md:border-r md:data-[state=closed]:slide-out-to-left md:data-[state=open]:slide-in-from-left",
  top: "md:inset-x-0 md:top-0 md:bottom-auto md:max-h-[calc(100vh-4rem)] md:border-b md:data-[state=closed]:slide-out-to-top md:data-[state=open]:slide-in-from-top",
  bottom:
    "md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[calc(100vh-4rem)] md:border-t md:data-[state=closed]:slide-out-to-bottom md:data-[state=open]:slide-in-from-bottom",
};

const hasVisibleTitle = (title: ModalProps["title"]) =>
  typeof title === "string" ? title.trim().length > 0 : Boolean(title);

export const Modal = ({
  open,
  onOpenChange,
  children,
  title,
  subtitle,
  actions,
  footer,
  footerHelp,
  presentation = "modal",
  anchor = "right",
  size = "md",
  centerTitle = false,
  showClose = true,
  closeLabel = "Close modal",
  closeOnOverlayClick = true,
  className,
  overlayClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  ariaLabel,
}: ModalProps) => {
  const isPanel = presentation === "panel";
  const isStackPanel = anchor === "top" || anchor === "bottom";
  const titleIsVisible = hasVisibleTitle(title);
  const inferredLabel =
    ariaLabel || (typeof title === "string" ? title : "Modal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          aria-label={!titleIsVisible ? inferredLabel : undefined}
          onPointerDownOutside={(event) => {
            if (!closeOnOverlayClick) event.preventDefault();
          }}
          className={cn(
            "fixed z-[710] flex min-h-0 w-screen flex-col bg-background text-foreground shadow-2xl outline-none",
            "inset-0 h-[100dvh]",
            "data-[state=closed]:animate-out data-[state=open]:animate-in",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            isPanel
              ? cn(
                  "md:w-auto",
                  isStackPanel
                    ? panelStackSizeClasses[size]
                    : panelSideSizeClasses[size],
                  panelAnchorClasses[anchor],
                  "md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0"
                )
              : cn(
                  "md:left-1/2 md:top-1/2 md:h-auto md:max-h-[calc(100vh-4rem)] md:w-[calc(100vw-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border",
                  modalSizeClasses[size],
                  "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0"
                ),
            className
          )}
        >
          {!titleIsVisible && (
            <DialogTitle className="sr-only">{inferredLabel}</DialogTitle>
          )}

          {(titleIsVisible || subtitle || actions || showClose) && (
            <div
              className={cn(
                isPanel
                  ? "flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 py-4"
                  : "flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4",
                centerTitle && "items-center text-center",
                headerClassName
              )}
            >
              <div
                className={cn(
                  "min-w-0 flex-1",
                  isPanel && "flex flex-col gap-1",
                  centerTitle && "pl-9"
                )}
              >
                {titleIsVisible ? (
                  <DialogTitle
                    className={cn("leading-tight", centerTitle && "text-center")}
                  >
                    {title}
                  </DialogTitle>
                ) : null}
                {subtitle ? (
                  <DialogDescription
                    className={cn(
                      isPanel ? "leading-tight" : "mt-1",
                      centerTitle && "text-center"
                    )}
                  >
                    {subtitle}
                  </DialogDescription>
                ) : null}
              </div>
              {(actions || showClose) && (
                <div className="flex shrink-0 items-center gap-2">
                  {actions}
                  {showClose && (
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={closeLabel}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </DialogClose>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5", bodyClassName)}
          >
            {children}
          </div>

          {(footerHelp || footer) && (
            <div
              className={cn(
                "flex shrink-0 flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                footerClassName
              )}
            >
              <div className="min-w-0 text-sm text-muted-foreground">
                {footerHelp}
              </div>
              {footer && (
                <div className="flex shrink-0 items-center justify-end gap-2">
                  {footer}
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
