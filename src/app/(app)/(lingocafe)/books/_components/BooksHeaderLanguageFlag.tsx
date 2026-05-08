"use client";

import Link from "next/link";

type BooksHeaderLanguageFlagProps = {
  code: string;
  label?: string | null;
};

const LANGUAGE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  es: "🇪🇸",
  it: "🇮🇹",
  sv: "🇸🇪",
};

export const BooksHeaderLanguageFlag = ({
  code,
  label,
}: BooksHeaderLanguageFlagProps) => {
  const normalizedCode = code.trim().toLowerCase();
  const flag = LANGUAGE_FLAGS[normalizedCode];

  if (!flag) {
    return null;
  }

  const languageLabel = label?.trim() || normalizedCode.toUpperCase();

  return (
    <Link
      href="/profile"
      aria-label={`Open profile. Active learning language: ${languageLabel}.`}
      title={`Learning language: ${languageLabel}`}
      className="flex h-10 shrink-0 items-center justify-center text-2xl leading-none transition-opacity hover:opacity-80"
    >
      <span aria-hidden="true">{flag}</span>
    </Link>
  );
};
