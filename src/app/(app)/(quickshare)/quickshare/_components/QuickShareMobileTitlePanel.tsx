'use client';

import { useEffect, useRef } from 'react';

export interface QuickShareMobileTitlePanelProps {
  isOpen: boolean;
  draftTitle: string;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  kbInset: number;
}

export const QuickShareMobileTitlePanel = ({
  isOpen,
  draftTitle,
  onChangeDraft,
  onSave,
  onCancel,
  saving = false,
  kbInset,
}: QuickShareMobileTitlePanelProps) => {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (draftTitle.trim().length > 0) {
      titleInputRef.current?.blur();
      onSave();
    }
  };

  return (
    <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="absolute inset-0 flex flex-col" style={{ height: '100dvh' }}>
        <div className="px-4 pt-4 pb-3 border-b text-base font-semibold">Rename share</div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <input
            ref={titleInputRef}
            type="text"
            value={draftTitle}
            onChange={(event) => onChangeDraft(event.target.value)}
            className="w-full h-12 px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
            placeholder="Share title"
            autoFocus
            enterKeyHint="done"
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div
          className="px-4 pb-4 pt-2 border-t bg-background"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
            transform: kbInset ? `translateY(-${kbInset}px)` : undefined,
            willChange: kbInset ? 'transform' : undefined,
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md bg-transparent px-4 py-3 text-foreground underline-offset-4 hover:bg-transparent hover:underline"
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
