"use client";

import { createContext, useContext } from "react";
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

const ModalStackContext = createContext(0);
const MODAL_BASE_Z_INDEX = 700;
const MODAL_STACK_STEP = 20;

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
    "md:inset-y-0 md:left-auto md:right-0 md:h-screen md:border-l",
  left: "md:inset-y-0 md:left-0 md:right-auto md:h-screen md:border-r",
  top: "md:inset-x-0 md:top-0 md:bottom-auto md:max-h-[calc(100vh-4rem)] md:border-b",
  bottom:
    "md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[calc(100vh-4rem)] md:border-t",
};

const panelAnchorOpenAnimationClasses: Record<ModalAnchor, string> = {
  right: "md:data-[state=open]:slide-in-from-right",
  left: "md:data-[state=open]:slide-in-from-left",
  top: "md:data-[state=open]:slide-in-from-top",
  bottom: "md:data-[state=open]:slide-in-from-bottom",
};

const panelAnchorCloseAnimationClasses: Record<ModalAnchor, string> = {
  right: "md:data-[state=closed]:slide-out-to-right",
  left: "md:data-[state=closed]:slide-out-to-left",
  top: "md:data-[state=closed]:slide-out-to-top",
  bottom: "md:data-[state=closed]:slide-out-to-bottom",
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
  skipOpenAnimation = false,
  skipCloseAnimation = false,
  onOpenAutoFocus,
  className,
  overlayClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  ariaLabel,
}: ModalProps) => {
  const parentStackLevel = useContext(ModalStackContext);
  const stackLevel = parentStackLevel + 1;
  const overlayZIndex =
    MODAL_BASE_Z_INDEX + (stackLevel - 1) * MODAL_STACK_STEP;
  const contentZIndex = overlayZIndex + 10;
  const isPanel = presentation === "panel";
  const isStackPanel = anchor === "top" || anchor === "bottom";
  const titleIsVisible = hasVisibleTitle(title);
  const inferredLabel =
    ariaLabel || (typeof title === "string" ? title : "Modal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          data-modal-stack-level={stackLevel}
          style={{ zIndex: overlayZIndex }}
          className={cn("flex items-stretch justify-stretch", overlayClassName)}
        >
          <DialogPrimitive.Content
            data-modal-stack-level={stackLevel}
            aria-label={!titleIsVisible ? inferredLabel : undefined}
            onPointerDownOutside={(event) => {
              if (!closeOnOverlayClick) event.preventDefault();
            }}
            onOpenAutoFocus={onOpenAutoFocus}
            style={{ zIndex: contentZIndex }}
            className={cn(
              "relative z-[710] flex min-h-full w-full flex-col bg-background text-foreground shadow-2xl outline-none",
              !skipCloseAnimation &&
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              !skipOpenAnimation &&
                "data-[state=open]:animate-in data-[state=open]:fade-in-0",
              isPanel
                ? cn(
                    "md:fixed",
                    "md:w-auto",
                    isStackPanel
                      ? panelStackSizeClasses[size]
                      : panelSideSizeClasses[size],
                    panelAnchorClasses[anchor],
                    !skipCloseAnimation &&
                      cn(
                        "md:data-[state=closed]:fade-out-0",
                        panelAnchorCloseAnimationClasses[anchor]
                      ),
                    !skipOpenAnimation &&
                      cn(
                        "md:data-[state=open]:fade-in-0",
                        panelAnchorOpenAnimationClasses[anchor]
                      )
                )
              : cn(
                  "md:fixed md:left-1/2 md:top-1/2 md:h-auto md:max-h-[calc(100vh-4rem)] md:w-[calc(100vw-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border",
                  modalSizeClasses[size],
                  !skipCloseAnimation &&
                    "md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-bottom-0",
                  !skipOpenAnimation &&
                    "md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0"
                ),
              className
            )}
          >
            <ModalStackContext.Provider value={stackLevel}>
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
                        className={cn(
                          "leading-tight",
                          centerTitle && "text-center"
                        )}
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
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto px-5 py-5",
                  bodyClassName
                )}
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
            </ModalStackContext.Provider>
          </DialogPrimitive.Content>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  );
};
