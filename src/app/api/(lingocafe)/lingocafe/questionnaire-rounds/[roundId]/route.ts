import { protectRoute } from "@/42go/policy";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  getQuestionnaireRound,
  questionnaireErrorResponse,
  questionnaireJson,
} from "@/app/api/(lingocafe)/lingocafe/_lib/questionnaires";

const getRound = async (
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
    return questionnaireJson(await getQuestionnaireRound({ userId, roundId }));
  } catch (error) {
    return questionnaireErrorResponse(error);
  }
};

export const GET = protectRoute(getRound, {
  require: { feature: "api:lingocafe", session: true },
});
