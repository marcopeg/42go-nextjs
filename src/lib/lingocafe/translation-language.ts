export type LingoCafeTranslationLanguageOption = {
  code: string;
};

export const normalizeLingoCafeTranslationLanguage = (
  language: string | null | undefined
) => (language || "").normalize("NFKC").trim().toLocaleLowerCase();

export const isSameLingoCafeTranslationLanguage = (
  source: string | null | undefined,
  target: string | null | undefined
) =>
  normalizeLingoCafeTranslationLanguage(source) ===
  normalizeLingoCafeTranslationLanguage(target);

export const filterLingoCafeTranslationTargets = <
  T extends LingoCafeTranslationLanguageOption,
>(
  options: readonly T[],
  readingLanguage: string | null | undefined
) => {
  const normalizedReadingLanguage =
    normalizeLingoCafeTranslationLanguage(readingLanguage);

  return options.filter(
    (option) =>
      normalizeLingoCafeTranslationLanguage(option.code) !==
      normalizedReadingLanguage
  );
};
