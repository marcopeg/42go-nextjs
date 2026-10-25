import { protectRoute } from "@/42go/policy";
import { decodeReaderSlug } from "@/lib/lingocafe/slug";
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
  const rawPageId = url.searchParams.get("scope_page");
  if (!kind && !rawPageId) return undefined;
  if ((kind !== "chapter" && kind !== "part") || !rawPageId) {
    throw new QuestionnaireServiceError("validation", "Invalid training scope.");
  }
  return { kind, pageId: decodeReaderSlug(rawPageId) };
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
    const { bookId: rawBookId } = await params;
    const bookId = decodeReaderSlug(rawBookId);
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
