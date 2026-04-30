"use client";

import { useRef, useEffect } from "react";

export interface HeaderTitleProps {
  listTitle: string;
  editingList: boolean;
  draftListTitle: string;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const HeaderTitle = ({
  listTitle,
  editingList,
  draftListTitle,
  onStartEdit,
  onChangeDraft,
  onSave,
  onCancel,
}: HeaderTitleProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingList) {
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) {
        const el = titleInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }
  }, [editingList]);

  return (
    <div className="min-w-0">
      {/* Desktop: inline editor */}
      <div className="hidden md:block">
        {editingList ? (
          <input
            ref={titleInputRef}
            className="w-full max-w-[60vw] px-2 py-1 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={draftListTitle}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSave();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            onBlur={onCancel}
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            title="Rename list"
            className="truncate text-left hover:opacity-80"
          >
            {listTitle || "Loading..."}
          </button>
        )}
      </div>
      {/* Mobile: tap to open bottom sheet (keeps text visible in header) */}
      <div className="md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStartEdit}
            title="Rename list"
            className="truncate text-left hover:opacity-80 flex-1"
          >
            {listTitle || "Loading..."}
          </button>
        </div>
      </div>
    </div>
  );
};