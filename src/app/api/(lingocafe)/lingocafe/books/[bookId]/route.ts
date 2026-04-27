import { protectRoute } from "@/42go/policy";
import {
  getSessionUserId,
  json,
  loadBookInfo,
  trackReaderEvent,
} from "../../_lib/reader";

const notFound = () =>
  json(
    {
      error: "not_found",
      message: "Book not found.",
    },
    { status: 404 }
  );

const getBookInfo = async (
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) => {
  void req.url;

  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const { bookId } = await params;
  if (!bookId) return notFound();

  const book = await loadBookInfo(bookId);
  if (!book) return notFound();

  await trackReaderEvent({
    userId,
    name: "book-info",
    bookId: book.id,
  });

  return json({ book });
};

export const GET = protectRoute(getBookInfo, {
  require: { feature: "api:lingocafe", session: true },
});
