"use client";

import { useCallback, useEffect, useState } from "react";

import { useTheme } from "@/42go/config/ThemeProvider";
import {
  DEFAULT_READER_TRANSLATION_SCOPE,
  READER_PREFERENCES_STORAGE_KEY,
  getDefaultReaderPreferences,
  getReaderThemeStyle,
  readStoredReaderPreferencesStore,
  sanitizeReaderFontSizeIndex,
  sanitizeReaderPreferences,
  sanitizeReaderTranslationScope,
  type ReaderPreferences,
  type ReaderPreferencesStore,
  type ReaderThemeMode,
  type ReaderThemeProfileKey,
  type ReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import type { ReaderPlaybackSettingsSurface } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

type ReaderPreferenceKey = keyof ReaderPreferences;

type UseReaderPreferencesOptions = {
  trackEvent: (name: string, data?: Record<string, unknown>) => void;
  eventContext?: Record<string, unknown>;
  setSettingsSurfaceOpen: (
    surface: ReaderPlaybackSettingsSurface,
    isOpen: boolean
  ) => void;
};

const READER_SETTING_KEYS: ReaderPreferenceKey[] = [
  "fontSizeIndex",
  "fontFamilyKey",
  "backgroundKey",
  "foregroundKey",
];

const getInitialReaderPreferences = () => {
  if (typeof window === "undefined") return {};
  return readStoredReaderPreferencesStore();
};

export const useReaderPreferences = ({
  trackEvent,
  eventContext = {},
  setSettingsSurfaceOpen,
}: UseReaderPreferencesOptions) => {
  const { resolvedTheme, theme } = useTheme();
  const [store, setStore] =
    useState<ReaderPreferencesStore>(getInitialReaderPreferences);
  const [isOpen, setIsOpen] = useState(false);
  const themeMode: ReaderThemeMode =
    resolvedTheme === "dark" ? "dark" : "light";
  const themeProfile: ReaderThemeProfileKey =
    theme === "light" || theme === "dark" ? theme : "system";
  const storedPreferences = store[themeProfile] ?? null;
  const canResetPreferences = Boolean(storedPreferences);
  const basePreferences =
    storedPreferences ?? getDefaultReaderPreferences(themeMode);
  const preferences = {
    ...basePreferences,
    fontSizeIndex:
      sanitizeReaderFontSizeIndex(store.sharedFontSizeIndex) ??
      basePreferences.fontSizeIndex,
  };
  const translationScope = sanitizeReaderTranslationScope(
    store.translationScope ?? DEFAULT_READER_TRANSLATION_SCOPE
  );
  const readerThemeStyle = getReaderThemeStyle(preferences, themeMode);
  const settingsEventData = {
    ...eventContext,
    theme_profile: themeProfile,
    theme_mode: themeMode,
  };

  const onOpenChange = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      setSettingsSurfaceOpen("preferences", next);
    },
    [setSettingsSurfaceOpen]
  );

  const open = () => {
    if (!isOpen) {
      trackEvent("read.settings.opened", settingsEventData);
    }
    onOpenChange(true);
  };

  useEffect(() => {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(READER_PREFERENCES_STORAGE_KEY);
      return;
    }

    localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const updatePreferences = (next: Partial<ReaderPreferences>) => {
    const changedKeys = (Object.keys(next) as ReaderPreferenceKey[]).filter(
      (key) => preferences[key] !== next[key]
    );

    if (changedKeys.length > 0) {
      const nextValues = changedKeys.reduce<Record<string, unknown>>(
        (acc, key) => {
          acc[key] = next[key];
          return acc;
        },
        {}
      );
      trackEvent("read.settings.changed", {
        ...settingsEventData,
        action: "update",
        changed_fields: changedKeys,
        next_values: nextValues,
      });
    }

    setStore((current) => {
      const nextStore: ReaderPreferencesStore = {
        ...current,
        [themeProfile]: sanitizeReaderPreferences({
          ...preferences,
          ...current[themeProfile],
          ...next,
        }),
      };
      const sharedFontSizeIndex = sanitizeReaderFontSizeIndex(next.fontSizeIndex);

      if (sharedFontSizeIndex !== null) {
        nextStore.sharedFontSizeIndex = sharedFontSizeIndex;
      }

      return nextStore;
    });
  };

  const updateTranslationScope = (next: ReaderTranslationScope) => {
    if (translationScope === next) return;

    trackEvent("read.settings.changed", {
      ...settingsEventData,
      action: "update",
      changed_fields: ["translationScope"],
      next_values: { translationScope: next },
    });
    setStore((current) => ({
      ...current,
      translationScope: sanitizeReaderTranslationScope(next),
    }));
  };

  const resetPreferences = () => {
    trackEvent("read.settings.changed", {
      ...settingsEventData,
      action: "reset",
      changed_fields: READER_SETTING_KEYS,
    });
    setStore((current) => {
      const next = { ...current };
      delete next[themeProfile];
      return next;
    });
  };

  return {
    preferences,
    translationScope,
    readerThemeStyle,
    canResetPreferences,
    isOpen,
    open,
    onOpenChange,
    updatePreferences,
    updateTranslationScope,
    resetPreferences,
  };
};
