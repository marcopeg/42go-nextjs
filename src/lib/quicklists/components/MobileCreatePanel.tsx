"use client";

import { useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export interface MobileCreatePanelProps {
  mounted: boolean;
  isOpen: boolean;
  newTitle: string;
  onChangeTitle: (value: string) => void;
  onCreate: () => void;
  onToggle: () => void;
  onClose: () => void;
  submitting?: boolean;
  canSubmit: boolean;
  kbInset: number;
}

export const MobileCreatePanel = ({
  mounted,
  isOpen,
  newTitle,
  onChangeTitle,
  onCreate,
  onToggle,
  onClose,
  submitting = false,
  canSubmit,
  kbInset,
}: MobileCreatePanelProps) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (canSubmit) {
      inputRef.current?.blur();
      onCreate();
      onClose();
    }
  };

  const handleClose = () => {
    inputRef.current?.blur();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {!isOpen && (
        <Button
          size="fab"
          aria-label="Add task"
          title="Add task"
          className="md:hidden fixed z-[300] shadow-lg hover:shadow-xl active:scale-95"
          style={{
            right: "1rem",
            bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
            WebkitAppearance: "none",
            appearance: "none",
            minWidth: 56,
            minHeight: 56,
            maxWidth: 56,
            maxHeight: 56,
          }}
          onClick={onToggle}
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div
            className="absolute inset-0 flex flex-col"
            style={{ height: "100dvh" }}
          >
            <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
              <div className="text-base font-semibold">Create task</div>
              <button
                type="button"
                aria-label="Cancel"
                title="Close"
                onClick={handleClose}
                className="p-2 rounded-md hover:bg-muted/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <textarea
                ref={inputRef}
                value={newTitle}
                onChange={(e) => onChangeTitle(e.target.value)}
                className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base resize-none min-h-[140px]"
                placeholder="Task title (use newline, , or ; to add many)"
                autoFocus
                enterKeyHint="enter"
                inputMode="text"
                autoCapitalize="sentences"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <div
              className="px-4 pb-4 pt-2 border-t bg-background"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                transform: kbInset ? `translateY(-${kbInset}px)` : undefined,
                willChange: kbInset ? "transform" : undefined,
              }}
            >
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 rounded-md border border-transparent bg-transparent hover:bg-muted/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={submitting || !canSubmit}
                  className="flex-1 px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};