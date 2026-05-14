export type LingoCafeLanguageOption = {
  code: string;
  label: string;
};

export type LingoCafeLevelOption = {
  code: string;
  label: string;
};

export const lingoCafeProfileOptions = {
  ownLang: [
    { code: "en", label: "English" },
    { code: "it", label: "Italian" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "sv", label: "Swedish" },
    { code: "fr", label: "French" },
    { code: "pt", label: "Portuguese" },
    { code: "nl", label: "Dutch" },
    { code: "da", label: "Danish" },
    { code: "no", label: "Norwegian" },
    { code: "fi", label: "Finnish" },
    { code: "pl", label: "Polish" },
    { code: "cs", label: "Czech" },
    { code: "el", label: "Greek" },
  ] satisfies LingoCafeLanguageOption[],
  targetLang: [
    { code: "en", label: "English" },
    { code: "it", label: "Italian" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "sv", label: "Swedish" },
  ] satisfies LingoCafeLanguageOption[],
  targetLevel: [
    { code: "zero", label: "Zero" },
    { code: "a1", label: "A1" },
    { code: "a2", label: "A2" },
    { code: "b1", label: "B1" },
    { code: "b2", label: "B2" },
    { code: "expert", label: "Expert" },
  ] satisfies LingoCafeLevelOption[],
} as const;

const ownLanguageAliases: Record<string, string> = {
  nb: "no",
  nn: "no",
};

export const resolveLingoCafeOwnLanguage = (
  languageTags: readonly string[] | string | null | undefined
) => {
  const candidates = Array.isArray(languageTags)
    ? languageTags
    : languageTags
      ? [languageTags]
      : [];
  const ownLangCodes = new Set(
    lingoCafeProfileOptions.ownLang.map((option) => option.code)
  );

  for (const tag of candidates) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0] || "";
    const code = ownLanguageAliases[primary] || primary;
    if (ownLangCodes.has(code)) return code;
  }

  return "en";
};

export const getLingoCafeReaderLanguages = () => ({
  own: [...lingoCafeProfileOptions.ownLang],
  target: [...lingoCafeProfileOptions.targetLang],
  levels: [...lingoCafeProfileOptions.targetLevel],
});

export const lingoCafeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ownLang", "targetLang"],
  properties: {
    ownLang: {
      type: "string",
      enum: lingoCafeProfileOptions.ownLang.map((option) => option.code),
    },
    targetLang: {
      type: "string",
      enum: lingoCafeProfileOptions.targetLang.map((option) => option.code),
    },
    targetLevel: {
      type: ["string", "null"],
      enum: [
        ...lingoCafeProfileOptions.targetLevel.map((option) => option.code),
        null,
      ],
    },
  },
} as const;
