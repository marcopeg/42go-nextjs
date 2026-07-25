"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Modal } from "@/42go/components/modal/Modal";
import type { TextareaModalProps } from "@/42go/components/modal/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const TextareaModal = ({
  open,
  onOpenChange,
  title,
  value,
  onValueChange,
  onSave,
  textareaLabel,
  placeholder,
  error,
  saving = false,
  saveDisabled = false,
  saveLabel = "Save",
  savingLabel = "Saving…",
  cancelLabel = "Cancel",
  closeLabel,
  size = "md",
}: TextareaModalProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = useId();
  const errorId = `${textareaId}-error`;
  const accessibleLabel =
    textareaLabel || (typeof title === "string" ? title : "Text");
  const isDesktop = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );
  const keyboardInset = useSyncExternalStore(
    (onChange) => {
      if (!open || typeof window === "undefined" || !window.visualViewport) {
        return () => {};
      }

      const viewport = window.visualViewport;
      viewport.addEventListener("resize", onChange);
      viewport.addEventListener("scroll", onChange);
      return () => {
        viewport.removeEventListener("resize", onChange);
        viewport.removeEventListener("scroll", onChange);
      };
    },
    () => {
      if (!open || typeof window === "undefined" || !window.visualViewport) {
        return 0;
      }

      const viewport = window.visualViewport;
      return Math.round(
        Math.max(
          0,
          window.innerHeight - (viewport.height + viewport.offsetTop)
        )
      );
    },
    () => 0
  );

  useEffect(() => {
    if (!open || isDesktop) return;

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [isDesktop, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const handleMobileClose = () => {
    textareaRef.current?.blur();
    handleOpenChange(false);
  };

  const handleMobileSave = () => {
    if (saving || saveDisabled) return;
    textareaRef.current?.blur();
    onSave();
  };

  if (!open) return null;

  if (!isDesktop) {
    return createPortal(
      <div className="fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div
          className="absolute inset-0 flex flex-col"
          style={{ height: "100dvh" }}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : accessibleLabel}
        >
          <div className="flex items-center justify-between border-b px-4 pt-4 pb-3">
            <div className="text-base font-semibold">{title}</div>
            <button
              type="button"
              aria-label={closeLabel || "Cancel"}
              title="Close"
              onClick={handleMobileClose}
              disabled={saving}
              className="rounded-md p-2 hover:bg-muted/20 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <label htmlFor={textareaId} className="sr-only">
              {accessibleLabel}
            </label>
            <textarea
              ref={textareaRef}
              id={textareaId}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              className="min-h-[140px] w-full resize-none rounded-md border bg-background px-3 py-3 text-base focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder={placeholder}
              disabled={saving}
              autoFocus
              enterKeyHint="enter"
              inputMode="text"
              autoCapitalize="sentences"
              onFocus={(event) => event.currentTarget.select()}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            {error && (
              <p
                id={errorId}
                className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <div
            className="border-t bg-background px-4 pt-2 pb-4"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
              transform: keyboardInset
                ? `translateY(-${keyboardInset}px)`
                : undefined,
              willChange: keyboardInset ? "transform" : undefined,
            }}
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMobileClose}
                disabled={saving}
                className="flex-1 rounded-md bg-transparent px-4 py-3 text-foreground underline-offset-4 hover:bg-transparent hover:underline disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleMobileSave}
                disabled={saving || saveDisabled}
                className="flex-1 rounded-md bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
              >
                {saving ? savingLabel : saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      presentation="modal"
      size={size}
      closeLabel={closeLabel || `Close ${accessibleLabel.toLowerCase()}`}
      closeOnOverlayClick={!saving}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }}
      bodyClassName="p-5"
      footerClassName="px-5 py-4"
      footer={
        <>
          <Button
            type="button"
            variant="neutralLink"
            className="min-w-28"
            disabled={saving}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="min-w-28"
            disabled={saving || saveDisabled}
            onClick={onSave}
          >
            {saving ? savingLabel : saveLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label htmlFor={textareaId} className="sr-only">
          {accessibleLabel}
        </label>
        <Textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-48 resize-none"
          disabled={saving}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p
            id={errorId}
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
