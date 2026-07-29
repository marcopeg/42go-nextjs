import { protectRoute } from "@/42go/policy";
import {
  getSessionUserId,
  json,
  markBookRead,
  markBookUnread,
} from "../../../_lib/reader";

const notFound = () =>
  json(
    {
      error: "not_found",
      message: "Book not found.",
    },
    { status: 404 }
  );

const mutateCompletion = async (
  operation: typeof markBookRead | typeof markBookUnread,
  { params }: { params: Promise<{ bookId: string }> }
) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const { bookId } = await params;
  if (!bookId) return notFound();

  const result = await operation({ userId, bookId });
  if (!result) return notFound();

  return json(result);
};

const markRead = async (
  req: Request,
  context: { params: Promise<{ bookId: string }> }
) => {
  void req.url;
  return mutateCompletion(markBookRead, context);
};

const markUnread = async (
  req: Request,
  context: { params: Promise<{ bookId: string }> }
) => {
  void req.url;
  return mutateCompletion(markBookUnread, context);
};

export const PUT = protectRoute(markRead, {
  require: { feature: "api:lingocafe", session: true },
});

export const DELETE = protectRoute(markUnread, {
  require: { feature: "api:lingocafe", session: true },
});
