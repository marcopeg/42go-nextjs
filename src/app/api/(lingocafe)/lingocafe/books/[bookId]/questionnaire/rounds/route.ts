import { protectRoute } from "@/42go/policy";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  questionnaireErrorResponse,
  questionnaireJson,
  QuestionnaireServiceError,
  startQuestionnaireRound,
  type QuestionnaireTrainingScope,
} from "@/app/api/(lingocafe)/lingocafe/_lib/questionnaires";

const readTrainingScope = (req: Request): QuestionnaireTrainingScope | undefined => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("scope");
  const pageId = url.searchParams.get("scope_page");
  if (!kind && !pageId) return undefined;
  if ((kind !== "chapter" && kind !== "part") || !pageId) {
    throw new QuestionnaireServiceError("validation", "Invalid training scope.");
  }
  return { kind, pageId };
};

const startRound = async (
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
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
    const { bookId } = await params;
    const scope = readTrainingScope(req);
    return questionnaireJson(await startQuestionnaireRound({
      userId,
      bookId,
      mode: scope ? `${scope.kind}:${scope.pageId}` : undefined,
      scope,
    }));
  } catch (error) {
    return questionnaireErrorResponse(error);
  }
};

export const POST = protectRoute(startRound, {
  require: { feature: "api:lingocafe", session: true },
});
