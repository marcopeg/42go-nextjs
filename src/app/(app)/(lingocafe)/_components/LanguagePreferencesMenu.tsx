"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Modal } from "@/42go/components/modal";
import {
  DEFAULT_READER_TRANSLATION_SCOPE,
  readStoredReaderPreferencesStore,
  sanitizeReaderTranslationScope,
  type ReaderTranslationScope,
  writeStoredReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lingoCafeProfileOptions } from "@/config/lingocafe/profile-options";
import { cn } from "@/lib/utils";

const bandOptions: Array<{
  band: LanguagePreferenceBand;
  profileLevel: "a1" | "a2" | "b2";
  label: string;
  levels: string;
  compactLevels: string;
}> = [
  { band: "beginner", profileLevel: "a1", label: "Beginner", levels: "A1", compactLevels: "a1" },
  { band: "intermediate", profileLevel: "a2", label: "Intermediate", levels: "A2 + B1", compactLevels: "a2/b1" },
  { band: "advanced", profileLevel: "b2", label: "Advanced", levels: "B2", compactLevels: "b2" },
];

const getFlag = (language: string) =>
  lingoCafeProfileOptions.targetLang.find((option) => option.code === language)?.flag
  ?? language.toUpperCase();

export type LanguagePreferenceBand = "beginner" | "intermediate" | "advanced";

export type LanguagePreferencePatch = {
  targetLang?: string;
  targetLevel?: "a1" | "a2" | "b2";
};

export const LanguagePreferencesMenu = ({
  targetLanguage,
  band,
  onSaved,
}: {
  targetLanguage: string;
  band: LanguagePreferenceBand;
  onSaved: (patch: LanguagePreferencePatch) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(targetLanguage);
  const [selectedBand, setSelectedBand] = useState(band);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTranslationScope, setSavedTranslationScope] =
    useState<ReaderTranslationScope>(DEFAULT_READER_TRANSLATION_SCOPE);
  const [selectedTranslationScope, setSelectedTranslationScope] =
    useState<ReaderTranslationScope>(DEFAULT_READER_TRANSLATION_SCOPE);
  const isDesktop = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );

  const selectedBandOption = bandOptions.find((option) => option.band === selectedBand)!;
  const hasChanges =
    selectedLanguage !== targetLanguage ||
    selectedBand !== band ||
    selectedTranslationScope !== savedTranslationScope;
  const orderedLanguages = [
    ...lingoCafeProfileOptions.targetLang.filter((option) => option.code === selectedLanguage),
    ...lingoCafeProfileOptions.targetLang.filter((option) => option.code !== selectedLanguage),
  ];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    if (nextOpen) {
      const storedTranslationScope = sanitizeReaderTranslationScope(
        readStoredReaderPreferencesStore().translationScope
      );
      setSelectedLanguage(targetLanguage);
      setSelectedBand(band);
      setSavedTranslationScope(storedTranslationScope);
      setSelectedTranslationScope(storedTranslationScope);
      setError(null);
    } else {
      setSelectedLanguage(targetLanguage);
      setSelectedBand(band);
      setSelectedTranslationScope(savedTranslationScope);
    }
    setOpen(nextOpen);
  };

  const save = async () => {
    if (saving || !hasChanges) {
      if (!hasChanges) setOpen(false);
      return;
    }

    const selectedProfileLevel = bandOptions.find(
      (option) => option.band === selectedBand
    )!.profileLevel;
    const patch: LanguagePreferencePatch = {
      ...(selectedLanguage !== targetLanguage ? { targetLang: selectedLanguage } : {}),
      ...(selectedBand !== band ? { targetLevel: selectedProfileLevel } : {}),
    };

    setSaving(true);
    setError(null);
    try {
      const hasProfileChanges = Object.keys(patch).length > 0;
      const response = hasProfileChanges ? await fetch("/api/profile", {
        method: "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: patch,
          source: "language-preferences",
          method: "preferences-save",
        }),
      }) : null;
      const payload = response
        ? (await response.json().catch(() => null)) as { message?: string } | null
        : null;
      if (response && !response.ok) {
        throw new Error(payload?.message || "Could not save language preferences.");
      }
      if (selectedTranslationScope !== savedTranslationScope) {
        writeStoredReaderTranslationScope(selectedTranslationScope);
        setSavedTranslationScope(selectedTranslationScope);
      }
      if (hasProfileChanges) onSaved(patch);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save language preferences.");
    } finally {
      setSaving(false);
    }
  };

  const preferenceFields = (
    <>
      <section aria-labelledby="learning-language-label" className="space-y-2">
        <div>
          <h2 id="learning-language-label" className="text-sm font-semibold">Learning language</h2>
          <p className="text-xs text-muted-foreground">Choose your learning language.</p>
        </div>
        <div
          className="flex flex-nowrap gap-1 overflow-x-auto pb-1"
          role="group"
          aria-label="Learning language"
        >
          {orderedLanguages.map((option) => {
            const selected = selectedLanguage === option.code;
            return (
              <button
                key={option.code}
                type="button"
                aria-label={option.label}
                aria-pressed={selected}
                disabled={saving}
                onClick={() => {
                  if (selected) return;
                  setSelectedLanguage(option.code);
                }}
                className={cn(
                  "relative flex min-h-14 w-16 shrink-0 flex-col items-center justify-center rounded-md border px-1 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
                  selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted"
                )}
              >
                <span aria-hidden="true" className="text-xl leading-none">{option.flag}</span>
                <span className="mt-1 text-[10px] font-medium leading-none">{option.code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="learning-level-label" className="space-y-2">
        <div>
          <h2 id="learning-level-label" className="text-sm font-semibold">Learning level</h2>
          <p className="text-xs text-muted-foreground">Choose your current learning level.</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/20 p-1" role="group" aria-label="Learning level">
          {bandOptions.map((option) => {
            const selected = selectedBand === option.band;
            return (
              <button
                key={option.band}
                type="button"
                aria-pressed={selected}
                disabled={saving}
                onClick={() => {
                  if (selected) return;
                  setSelectedBand(option.band);
                }}
                className={cn(
                  "min-h-12 rounded-md border px-1 py-1.5 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
                  selected ? "border-primary bg-primary/10" : "border-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="block truncate text-xs font-medium">{option.label}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide">{option.levels}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="translation-scope-label" className="space-y-2">
        <div>
          <h2 id="translation-scope-label" className="text-sm font-semibold">Translate text</h2>
          <p className="text-xs text-muted-foreground">Choose what a tap translates while reading.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/20 p-1" role="group" aria-label="Translation selection">
          {([
            { id: "sentence", label: "Sentence" },
            { id: "word", label: "Word" },
          ] as const).map((option) => {
            const selected = selectedTranslationScope === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                disabled={saving}
                onClick={() => setSelectedTranslationScope(option.id)}
                className={cn(
                  "min-h-11 rounded-md border px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
                  selected ? "border-primary bg-primary/10" : "border-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </>
  );

  const triggerContent = (
    <>
      <span aria-hidden="true" className="text-xl leading-none">{getFlag(selectedLanguage)}</span>
      <span className="mt-1 text-xs font-medium text-foreground">
        {selectedBandOption.compactLevels}
      </span>
    </>
  );

  if (!isDesktop) {
    return (
      <>
        <button
          type="button"
          aria-label={`Learning language ${selectedLanguage.toUpperCase()}, level ${selectedBandOption.label}. Change preferences.`}
          onClick={() => handleOpenChange(true)}
          className="flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-md px-1 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {triggerContent}
        </button>
        <Modal
          open={open}
          onOpenChange={handleOpenChange}
          title="Language Preferences"
          actions={(
            <Button
              type="button"
              variant="neutralGhost"
              size="sm"
              className="text-primary hover:text-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Saving…
                </>
              ) : hasChanges ? "Save" : "Done"}
            </Button>
          )}
          showClose={false}
          closeOnOverlayClick={!saving}
          bodyClassName="flex flex-col"
        >
          <div className="flex min-h-full flex-col gap-6">
            {preferenceFields}
            <Button variant="neutralGhost" className="mt-auto w-full" asChild>
              <Link href="/profile" aria-disabled={saving || undefined}>Go to your profile</Link>
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Learning language ${selectedLanguage.toUpperCase()}, level ${selectedBandOption.label}. Change preferences.`}
          className="flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-md px-1 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {triggerContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] space-y-4 p-4"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        {preferenceFields}
        <div className="space-y-1 border-t pt-3">
          <Button
            type="button"
            className="w-full"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Saving…
              </>
            ) : hasChanges ? "Save" : "Close"}
          </Button>
          <Button variant="neutralGhost" className="w-full" asChild>
            <Link href="/profile" aria-disabled={saving || undefined}>Go to your profile</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
