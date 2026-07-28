"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, ChevronDown, LoaderCircle } from "lucide-react";

import { DisplayDate } from "@/42go/components/DisplayDate";
import { NotificationCenter } from "@/42go/components/Notifications";
import { Panel } from "@/42go/components/panel";
import type { Communication } from "@/42go/communications";
import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

type HistoryPayload = {
  items: Communication[];
  nextCursor: string | null;
};

export default function NotificationsPage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Communication[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ view: "history" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/notifications?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await res.json()) as HistoryPayload & { message?: string };
      if (!res.ok) throw new Error(payload.message || "Could not load history.");
      setHistory((current) => (cursor ? [...current, ...payload.items] : payload.items));
      setNextCursor(payload.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    if (history.length === 0) {
      const timer = window.setTimeout(() => void loadHistory(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [history.length, historyOpen, loadHistory]);

  const handleQueueLoaded = useCallback((count: number) => {
    setActiveCount(count);
    if (count === 0) setHistoryOpen(true);
  }, []);

  return (
    <AppLayout
      title="Notifications"
      subtitle="Current messages and your response history"
      icon={Bell}
      policy={{ require: { feature: "page:notifications", session: true } }}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section aria-labelledby="active-notifications-title" className="space-y-3">
          <h2 id="active-notifications-title" className="text-lg font-semibold">
            Active
          </h2>
          <NotificationCenter onQueueLoaded={handleQueueLoaded} />
          {activeCount === 0 && (
            <Panel><p className="text-sm text-muted-foreground">You have no notifications waiting.</p></Panel>
          )}
        </section>

        <section aria-labelledby="notification-history-title">
          <Button
            variant="neutralGhost"
            className="w-full justify-between px-0 text-lg font-semibold"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <span id="notification-history-title">History</span>
            <ChevronDown className={`h-5 w-5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </Button>
          {historyOpen && (
            <div className="mt-3 space-y-3">
              {history.map((item) => (
                <Panel key={item.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{item.title || "Notification"}</h3>
                    <DisplayDate date={item.respondedAt} className="shrink-0 text-xs text-muted-foreground" />
                  </div>
                  {item.bodyMarkdown && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{item.bodyMarkdown}</p>
                  )}
                  <p className="text-sm">
                    {item.skipped
                      ? "Skipped"
                      : item.reaction
                        ? `Response: ${item.reaction}`
                        : item.response
                          ? `Response: ${JSON.stringify(item.response)}`
                          : "Viewed"}
                  </p>
                </Panel>
              ))}
              {!loading && history.length === 0 && !error && (
                <p className="text-sm text-muted-foreground">No notification history yet.</p>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {loading && <LoaderCircle className="mx-auto h-5 w-5 animate-spin" aria-label="Loading history" />}
              {nextCursor && !loading && (
                <Button variant="outline" className="w-full" onClick={() => void loadHistory(nextCursor)}>
                  Load more
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
