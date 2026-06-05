import { z } from "zod";

import { recordEvent } from "@/42go/events/server";
import { protectRoute } from "@/42go/policy";

import {
  type BookPageDetail,
  getReaderProfileStringValue,
  getSessionUserId,
  json,
  loadBookPage,
  loadReaderProfile,
} from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  TranslationProviderError,
  getCachedTranslation,
  isTranslationEnabled,
  normalizeTranslationLanguage,
  type TranslationResult,
  translateAndCacheText,
} from "@/app/api/(lingocafe)/lingocafe/_lib/translation";

const defaultMaxTranslateLength = 500;
const maxSafeTranslateLength = 5000;

const translationPayloadSchema = z.object({
  text: z.string().trim().min(1),
  from: z.string().trim().min(2).max(16),
  to: z.string().trim().min(2).max(16),
  bookId: z.string().trim().min(1).max(256),
  pageId: z.string().trim().min(1).max(256),
  sentenceId: z.string().trim().min(1).max(256).optional(),
});

type TranslationPayload = z.infer<typeof translationPayloadSchema>;

const closingSentenceCharacters = /^[\s"'’”)\]}»]*$/u;

const getMaxTranslateLength = () => {
  const parsed = Number(process.env.LC_MAX_TRANSLATE_LENGTH);
  if (
    Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= maxSafeTranslateLength
  ) {
    return parsed;
  }

  return defaultMaxTranslateLength;
};

const normalizeFormalText = (text: string) =>
  text.normalize("NFKC").trim().replace(/\s+/g, " ");

const hasSingleSentenceFullStopShape = (text: string) => {
  const normalized = normalizeFormalText(text);
  const firstFullStop = normalized.indexOf(".");
  if (firstFullStop === -1) return true;

  const lastFullStop = normalized.lastIndexOf(".");
  if (firstFullStop !== lastFullStop) return false;

  return closingSentenceCharacters.test(normalized.slice(lastFullStop + 1));
};

const getFormalValidationIssue = (text: string) => {
  const normalized = normalizeFormalText(text);
  const maxLength = getMaxTranslateLength();

  if (normalized.length > maxLength) {
    return `Text must be ${maxLength} characters or less.`;
  }

  if (!hasSingleSentenceFullStopShape(normalized)) {
    return "Text must be one sentence with no full stops in the middle.";
  }

  return null;
};

const normalizeMembershipText = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[`*_>#~\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

const isTextInBookPage = (text: string, bookPage: BookPageDetail) => {
  const requestedText = normalizeMembershipText(text);
  if (!requestedText) return false;

  const sourceText = normalizeMembershipText(
    [
      bookPage.page.title,
      bookPage.page.summary ?? "",
      bookPage.page.content,
    ].join("\n\n")
  );

  return sourceText.includes(requestedText);
};

const validationIssues = (
  message: string,
  issues: Partial<Record<keyof TranslationPayload, string[]>>
) =>
  json(
    {
      error: "validation",
      message,
      issues,
    },
    { status: 400 }
  );

const validationError = (message: string, field: keyof TranslationPayload) =>
  validationIssues(message, { [field]: [message] });

const getProfileLanguageIssues = async (
  payload: Pick<TranslationPayload, "from" | "to">,
  userId: string
) => {
  const profile = await loadReaderProfile(userId);
  const ownLang = getReaderProfileStringValue(profile, "ownLang");
  const targetLang = getReaderProfileStringValue(profile, "targetLang");
  const issues: Partial<Record<keyof TranslationPayload, string[]>> = {};

  if (!targetLang) {
    issues.from = ["Learning language is missing from your reader profile."];
  } else if (
    normalizeTranslationLanguage(payload.from) !==
    normalizeTranslationLanguage(targetLang)
  ) {
    issues.from = ["Source language must match your learning language."];
  }

  if (!ownLang) {
    issues.to = ["Own language is missing from your reader profile."];
  } else if (
    normalizeTranslationLanguage(payload.to) !==
    normalizeTranslationLanguage(ownLang)
  ) {
    issues.to = ["Target language must match your own language."];
  }

  return Object.keys(issues).length > 0 ? issues : null;
};

const recordTranslateEvent = async ({
  userId,
  translation,
  context,
}: {
  userId: string;
  translation: TranslationResult;
  context: TranslationPayload;
}) => {
  try {
    await recordEvent({
      appId: "lingocafe",
      userId,
      name: "page.translate",
      data: {
        cache_type: translation.source,
        from: translation.from,
        to: translation.to,
        translation_hash: translation.hash,
        ...(context.bookId ? { book_id: context.bookId } : {}),
        ...(context.pageId ? { page_id: context.pageId } : {}),
        ...(context.sentenceId ? { sentence_id: context.sentenceId } : {}),
      },
    });
  } catch (error) {
    console.error("LingoCafe translate event logging failed:", error);
  }
};

const postTranslation = async (req: Request) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const parsed = translationPayloadSchema.safeParse(
    await req.json().catch(() => null)
  );

  if (!parsed.success) {
    return json(
      {
        error: "validation",
        message: "Invalid translation payload.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const formalIssue = getFormalValidationIssue(parsed.data.text);
  if (formalIssue) {
    return validationError(formalIssue, "text");
  }

  if (!isTranslationEnabled()) {
    return json(
      {
        error: "forbidden",
        message: "Translation is not enabled.",
      },
      { status: 403 }
    );
  }

  try {
    const cachedTranslation = await getCachedTranslation(parsed.data);
    if (cachedTranslation) {
      await recordTranslateEvent({
        userId,
        translation: cachedTranslation,
        context: parsed.data,
      });

      return json({
        ok: true,
        translation: cachedTranslation,
      });
    }

    const profileLanguageIssues = await getProfileLanguageIssues(
      parsed.data,
      userId
    );
    if (profileLanguageIssues) {
      return validationIssues(
        "Translation languages must match your reader profile.",
        profileLanguageIssues
      );
    }

    const bookPage = await loadBookPage(parsed.data.bookId, parsed.data.pageId);
    if (!bookPage) {
      return json(
        {
          error: "not_found",
          message: "Book page not found.",
        },
        { status: 404 }
      );
    }

    if (
      normalizeTranslationLanguage(parsed.data.from) !==
      normalizeTranslationLanguage(bookPage.book.lang)
    ) {
      return validationError(
        "Source language must match the requested book language.",
        "from"
      );
    }

    if (!isTextInBookPage(parsed.data.text, bookPage)) {
      return validationError(
        "Text was not found in the requested book page.",
        "text"
      );
    }

    const translation = await translateAndCacheText(parsed.data);
    await recordTranslateEvent({
      userId,
      translation,
      context: parsed.data,
    });

    return json({
      ok: true,
      translation,
    });
  } catch (error) {
    if (error instanceof TranslationProviderError) {
      return json(
        {
          error: "translation_provider",
          message: error.message,
        },
        { status: error.status }
      );
    }

    return json(
      {
        error: "translation",
        message: "Could not translate text.",
      },
      { status: 502 }
    );
  }
};

export const POST = protectRoute(postTranslation, {
  require: { feature: "api:lingocafe", session: true },
});
