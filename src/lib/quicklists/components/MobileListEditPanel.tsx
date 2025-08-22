"use client";

import { useRef, useEffect } from "react";

export interface MobileListEditPanelProps {
  isOpen: boolean;
  draftTitle: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  kbInset: number;
}

export const MobileListEditPanel = ({
  isOpen,
  draftTitle,
  onChangeDraft,
  onSave,
  onCancel,
  saving = false,
  kbInset,
}: MobileListEditPanelProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSave = () => {
    if (draftTitle.trim().length > 0) {
      inputRef.current?.blur();
      onSave();
    }
  };

  return (
    <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className="absolute inset-0 flex flex-col"
        style={{ height: "100dvh" }}
      >
        <div className="px-4 pt-4 pb-3 border-b text-base font-semibold">
          Rename list
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={draftTitle}
            onChange={(e) => onChangeDraft(e.target.value)}
            className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
            placeholder="List name"
            autoFocus
            enterKeyHint="done"
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
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
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-md border"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || draftTitle.trim().length === 0}
              className="flex-1 px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};