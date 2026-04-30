import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import {
  getSessionUserId,
  json,
  loadBookPage,
  saveBookProgress,
  trackReaderEvent,
} from "../../../../_lib/reader";

const notFound = () =>
  json(
    {
      error: "not_found",
      message: "Book page not found.",
    },
    { status: 404 }
  );

const progressPayloadSchema = z.object({
  progress_bps: z.number().int().min(0).max(10000),
});

const getBookPage = async (
  req: Request,
  { params }: { params: Promise<{ bookId: string; pageId: string }> }
) => {
  void req.url;

  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const { bookId, pageId } = await params;
  if (!bookId || !pageId) return notFound();

  const bookPage = await loadBookPage(bookId, pageId);
  if (!bookPage) return notFound();

  await trackReaderEvent({
    userId,
    name: "page-open",
    bookId,
    pageId,
    data: { progress_bps: 0 },
  });
  await saveBookProgress({ userId, bookId, pageId, progressBps: 0 });

  return json({ bookPage });
};

const trackPageScroll = async (
  req: Request,
  { params }: { params: Promise<{ bookId: string; pageId: string }> }
) => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const { bookId, pageId } = await params;
  if (!bookId || !pageId) return notFound();

  const parsed = progressPayloadSchema.safeParse(
    await req.json().catch(() => null)
  );

  if (!parsed.success) {
    return json(
      {
        error: "validation",
        message: "Invalid page scroll payload.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const bookPage = await loadBookPage(bookId, pageId);
  if (!bookPage) return notFound();

  const progressBps = await saveBookProgress({
    userId,
    bookId,
    pageId,
    progressBps: parsed.data.progress_bps,
  });

  await trackReaderEvent({
    userId,
    name: "page-scroll",
    bookId,
    pageId,
    data: { progress_bps: progressBps },
  });

  return json({ ok: true, progress_bps: progressBps });
};

export const GET = protectRoute(getBookPage, {
  require: { feature: "api:lingocafe", session: true },
});

export const POST = protectRoute(trackPageScroll, {
  require: { feature: "api:lingocafe", session: true },
});
