"use client";

import { useState } from "react";

import { TextareaModal } from "@/42go/components/modal";
import {
  countQuicklistUnicodeCharacters,
  QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH,
} from "@/lib/quicklists/validation";

export type SortingInstructionsModalProps = {
  open: boolean;
  instructions: string;
  onOpenChange: (open: boolean) => void;
  onSave: (instructions: string) => Promise<void>;
};

export const SortingInstructionsModal = ({
  open,
  instructions,
  onOpenChange,
  onSave,
}: SortingInstructionsModalProps) => {
  const [draft, setDraft] = useState(instructions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterCount = countQuicklistUnicodeCharacters(draft);
  const overLimit =
    characterCount > QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH;
  const visibleError = overLimit
    ? `Instructions must be ${QUICKLIST_SORTING_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters or fewer.`
    : error;

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (saving || overLimit) return;

    try {
      setSaving(true);
      setError(null);
      await onSave(draft);
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save sorting instructions."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <TextareaModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Sorting instructions"
      value={draft}
      onValueChange={setDraft}
      onSave={() => void handleSave()}
      textareaLabel="Sorting instructions"
      placeholder="Describe how this list should be sorted"
      error={visibleError}
      saving={saving}
      saveDisabled={overLimit}
      closeLabel="Close sorting instructions"
    />
  );
};
