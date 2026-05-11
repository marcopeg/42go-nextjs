import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppInfo } from "@/42go/config/app-config";
import { recordEvents } from "@/42go/events/server";
import { normalizeClientEvents } from "@/42go/events";
import { protectRoute } from "@/42go/policy";

const json = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });

const postEvents = async (req: Request) => {
  const { id: appId, config } = await getAppInfo();
  const eventsConfig = config?.app?.events;
  if (!appId || !eventsConfig?.enabled) {
    return json({ error: "not-found" }, { status: 404 });
  }

  const session = await getServerSession(await getAuthOptions());
  const requiresSession = eventsConfig.requireSession !== false;
  const allowsAnonymous = eventsConfig.allowAnonymous === true;
  if (requiresSession && !session?.user?.id) {
    return json({ error: "session", message: "login required" }, { status: 401 });
  }
  if (!session?.user?.id && !allowsAnonymous) {
    return json({ error: "session", message: "login required" }, { status: 401 });
  }

  const userId = session?.user?.id || "anonymous";
  const body = await req.json().catch(() => null);

  try {
    const events = normalizeClientEvents(body);
    await recordEvents({
      appId,
      userId,
      events,
      meta: {
        source: "client",
      },
    });

    return json({ ok: true, count: events.length });
  } catch (error) {
    return json(
      {
        error: "validation",
        message: error instanceof Error ? error.message : "Invalid event batch.",
      },
      { status: 400 }
    );
  }
};

export const POST = protectRoute(postEvents, {
  require: { feature: "api:events" },
});
