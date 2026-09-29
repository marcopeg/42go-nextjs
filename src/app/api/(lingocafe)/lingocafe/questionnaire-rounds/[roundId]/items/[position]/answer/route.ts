import { protectRoute } from "@/42go/policy";
import { z } from "zod";

import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  answerQuestionnaireRoundItem,
  questionnaireErrorResponse,
  questionnaireJson,
} from "@/app/api/(lingocafe)/lingocafe/_lib/questionnaires";

const answerSchema = z.object({
  optionId: z.string().trim().min(1),
  durationMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
});

const answerItem = async (
  req: Request,
  {
    params,
  }: {
    params: Promise<{ roundId: string; position: string }>;
  }
) => {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return questionnaireJson(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }
    const payload = answerSchema.safeParse(await req.json().catch(() => null));
    if (!payload.success) {
      return questionnaireJson(
        { error: "validation", message: "Invalid questionnaire answer." },
        { status: 400 }
      );
    }
    const { roundId, position: rawPosition } = await params;
    const position = Number(rawPosition);
    return questionnaireJson(
      await answerQuestionnaireRoundItem({
        userId,
        roundId,
        position,
        optionId: payload.data.optionId,
        durationMs: payload.data.durationMs,
      })
    );
  } catch (error) {
    return questionnaireErrorResponse(error);
  }
};

export const POST = protectRoute(answerItem, {
  require: { feature: "api:lingocafe", session: true },
});
