import { protectRoute } from "@/42go/policy";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  finalizeQuestionnaireRound,
  questionnaireErrorResponse,
  questionnaireJson,
} from "@/app/api/(lingocafe)/lingocafe/_lib/questionnaires";

const finalizeRound = async (
  req: Request,
  { params }: { params: Promise<{ roundId: string }> }
) => {
  void req.url;
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return questionnaireJson(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }
    const { roundId } = await params;
    return questionnaireJson(await finalizeQuestionnaireRound({ userId, roundId }));
  } catch (error) {
    return questionnaireErrorResponse(error);
  }
};

export const POST = protectRoute(finalizeRound, {
  require: { feature: "api:lingocafe", session: true },
});
