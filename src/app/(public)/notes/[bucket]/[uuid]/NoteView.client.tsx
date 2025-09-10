"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/components/ui/toast";

type Props = { bucket: string; uuid: string };

export default function NoteView({ bucket, uuid }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{
    title: string;
    body: string;
    createdAt?: string | null;
    timeLeft?: number | null;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/notes/${encodeURIComponent(bucket)}/${encodeURIComponent(
            uuid
          )}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        if (!res.ok) {
          if (res.status === 404) {
            setError("Not found");
            return;
          }
          const j = await res.json().catch(() => ({}));
          setError(j.message || j.error || `Status ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setNote({
            title: data.title,
            body: data.body,
            createdAt: data.createdAt ?? null,
            timeLeft: data.timeLeft ?? null,
          });
          setTimeLeft(
            typeof data.timeLeft === "number"
              ? data.timeLeft
              : data.timeLeft
              ? Number(data.timeLeft)
              : null
          );
        }
      } catch (err) {
        if (!cancelled)
          setError((err as Error)?.message || "Failed to load note");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, uuid]);

  // live countdown updater every 5 seconds (must be declared before any returns)
  useEffect(() => {
    if (timeLeft == null) return;
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      setTimeLeft((t) => (t !== null && t > 0 ? Math.max(0, t - 5) : 0));
    };
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [timeLeft]);

  if (loading) {
    return <div className="p-8">Loading…</div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <div className="mt-4">
          <Button onClick={() => router.push("/notes/new")}>Create new</Button>
        </div>
      </div>
    );
  }

  const fmtTimeLeft = (secs: number | null) => {
    if (secs == null) return null;
    if (secs <= 0) return "Expired";
    if (secs < 60) return `${secs} second${secs === 1 ? "" : "s"} left`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} left`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hour${hrs === 1 ? "" : "s"} left`;
  };
  if (!note) {
    return <div className="p-8">No note</div>;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{note.title}</h1>
      {note.createdAt && (
        <p className="text-sm text-gray-500 mb-2">
          Created: {new Date(note.createdAt).toLocaleString()}
        </p>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {timeLeft != null ? fmtTimeLeft(timeLeft) : null}
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <a
            href={`/api/notes/${encodeURIComponent(
              bucket
            )}/${encodeURIComponent(uuid)}?raw`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700"
          >
            raw
          </a>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(note.body);
                toast({
                  title: "Copied",
                  description: "Note body copied to clipboard",
                });
              } catch {
                toast({
                  title: "Copy failed",
                  description: "Unable to copy note to clipboard",
                  variant: "destructive",
                });
              }
            }}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            copy
          </button>
        </div>
      </div>
      <Card>
        <div className="prose dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
        </div>
      </Card>
    </main>
  );
}
