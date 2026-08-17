import type { ReaderTranslationScope } from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";

export type ReaderAiModePromptInput = {
  scope: ReaderTranslationScope;
  selectedText: string;
  sentence: string;
  sourceLanguage: string;
  responseLanguage: string;
  surroundingContext?: {
    label: string;
    text: string;
  };
};

export const buildReaderAiModePrompt = ({
  scope,
  selectedText,
  sentence,
  sourceLanguage,
  responseLanguage,
  surroundingContext,
}: ReaderAiModePromptInput) => {
  const selectionDescription =
    scope === "word"
      ? `the ${sourceLanguage} word “${selectedText}” in the context of this complete sentence: “${sentence}”`
      : `this complete ${sourceLanguage} sentence: “${sentence}”`;

  return [
    `Help me learn ${selectionDescription}.`,
    `Respond in ${responseLanguage}.`,
    "Give a full language-learning explanation in this order:",
    "1. An accurate translation.",
    "2. The intended meaning in context.",
    "3. A separate explanation of any multi-word or composite expressions, when applicable.",
    "4. A detailed grammar and sentence-parsing analysis explaining each component and how they work together in communication.",
    ...(surroundingContext?.text.trim()
      ? [`Additional ${surroundingContext.label}:\n“${surroundingContext.text.trim()}”`]
      : []),
  ].join("\n");
};

export const getReaderAiModeUrl = (input: ReaderAiModePromptInput) => {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("udm", "50");
  url.searchParams.set("q", buildReaderAiModePrompt(input));
  return url.toString();
};
