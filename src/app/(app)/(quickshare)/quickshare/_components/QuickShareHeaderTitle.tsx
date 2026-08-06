'use client';

import { useEffect, useRef } from 'react';

export interface QuickShareHeaderTitleProps {
  shareTitle: string;
  editingTitle: boolean;
  draftShareTitle: string;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const QuickShareHeaderTitle = ({
  shareTitle,
  editingTitle,
  draftShareTitle,
  onStartEdit,
  onChangeDraft,
  onSave,
  onCancel,
}: QuickShareHeaderTitleProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingTitle) {
      const isDesktop =
        typeof window !== 'undefined' && window.innerWidth >= 768;
      if (isDesktop) {
        const el = titleInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }
  }, [editingTitle]);

  return (
    <div className="min-w-0">
      <div className="hidden md:block">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="w-full max-w-[60vw] px-2 py-1 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={draftShareTitle}
            onChange={(event) => onChangeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSave();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
              }
            }}
            onBlur={onCancel}
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            title="Rename share"
            className="truncate text-left hover:opacity-80"
          >
            {shareTitle || 'Loading...'}
          </button>
        )}
      </div>
      <div className="md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStartEdit}
            title="Rename share"
            className="truncate text-left hover:opacity-80 flex-1"
          >
            {shareTitle || 'Loading...'}
          </button>
        </div>
      </div>
    </div>
  );
};
