import { z } from "zod";

import { recordEvent } from "@/42go/events/server";
import { protectRoute } from "@/42go/policy";

import {
  getSessionUserId,
  json,
} from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  TranslationProviderError,
  hasUserFeatureFlag,
  type TranslationResult,
  translateText,
} from "@/app/api/(lingocafe)/lingocafe/_lib/translation";

const translationPayloadSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  from: z.string().trim().min(2).max(16),
  to: z.string().trim().min(2).max(16),
  bookId: z.string().trim().min(1).max(256).optional(),
  pageId: z.string().trim().min(1).max(256).optional(),
  sentenceId: z.string().trim().min(1).max(256).optional(),
});

const recordTranslateEvent = async ({
  userId,
  translation,
  context,
}: {
  userId: string;
  translation: TranslationResult;
  context: z.infer<typeof translationPayloadSchema>;
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

  const canTranslate = await hasUserFeatureFlag({
    userId,
    flag: "translate",
  });

  if (!canTranslate) {
    return json(
      {
        error: "forbidden",
        message: "Translation is not enabled for this user.",
      },
      { status: 403 }
    );
  }

  try {
    const translation = await translateText(parsed.data);
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
