"use client";

import { useRef, useEffect } from "react";
import { X, Trash2 } from "lucide-react";

export interface MobileEditPanelProps {
  isOpen: boolean;
  draftTitle: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
  canSubmit: boolean;
  kbInset: number;
}

export const MobileEditPanel = ({
  isOpen,
  draftTitle,
  onChangeDraft,
  onSave,
  onCancel,
  onDelete,
  saving = false,
  canSubmit,
  kbInset,
}: MobileEditPanelProps) => {
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

  if (!isOpen) return null;

  const handleDelete = () => {
    if (onDelete) {
      inputRef.current?.blur();
      if (typeof document !== "undefined") {
        const ae = document.activeElement as HTMLElement | null;
        ae?.blur?.();
      }
      setTimeout(() => {
        onDelete();
      }, 150);
    }
  };

  const handleSave = () => {
    inputRef.current?.blur();
    onSave();
  };

  return (
    <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className="absolute inset-0 flex flex-col"
        style={{ height: "100dvh" }}
      >
        <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
          <div className="text-base font-semibold">Edit task</div>
          <button
            type="button"
            aria-label="Cancel"
            title="Close"
            onClick={onCancel}
            className="p-2 rounded-md hover:bg-muted/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <textarea
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => onChangeDraft(e.target.value)}
            className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base resize-none min-h-[120px]"
            placeholder="Edit title (newline, , or ; add more items)"
            autoFocus
            enterKeyHint="enter"
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
          <div className="flex items-center justify-between">
            {onDelete && (
              <button
                type="button"
                title="Delete task"
                aria-label="Delete task"
                onClick={handleDelete}
                className="p-3 rounded-md text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSubmit}
              className="px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};