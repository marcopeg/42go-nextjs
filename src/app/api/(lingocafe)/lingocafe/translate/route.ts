import { z } from "zod";

import { protectRoute } from "@/42go/policy";

import {
  getSessionUserId,
  json,
} from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  TranslationProviderError,
  hasUserFeatureFlag,
  translateText,
} from "@/app/api/(lingocafe)/lingocafe/_lib/translation";

const translationPayloadSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  from: z.string().trim().min(2).max(16),
  to: z.string().trim().min(2).max(16),
});

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
    return json({
      ok: true,
      translation: await translateText(parsed.data),
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
