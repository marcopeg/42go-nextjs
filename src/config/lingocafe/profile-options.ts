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
    { code: "a2", label: "A2" },
    { code: "b1", label: "B1" },
  ] satisfies LingoCafeLevelOption[],
} as const;

export const getLingoCafeReaderLanguages = () => ({
  own: [...lingoCafeProfileOptions.ownLang],
  target: [...lingoCafeProfileOptions.targetLang],
  levels: [...lingoCafeProfileOptions.targetLevel],
});

export const lingoCafeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ownLang", "targetLang", "targetLevel"],
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
      type: "string",
      enum: lingoCafeProfileOptions.targetLevel.map((option) => option.code),
    },
  },
} as const;
