"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Card from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import matter from "gray-matter";
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
  const [frontmatter, setFrontmatter] = useState<Record<
    string,
    unknown
  > | null>(null);
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
          // parse frontmatter (YAML) if present and extract content
          const rawBody = data.body ?? "";
          let parsed;
          try {
            parsed = matter(String(rawBody));
          } catch {
            parsed = { content: rawBody, data: {} };
          }
          const content = parsed.content ?? rawBody;
          const fm =
            parsed.data && Object.keys(parsed.data).length ? parsed.data : null;
          setFrontmatter(fm);
          setNote({
            title: data.title,
            body: content,
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
  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${key} copied` });
    } catch {
      toast({
        title: "Copy failed",
        description: `Unable to copy ${key}`,
        variant: "destructive",
      });
    }
  };

  // Convert single newlines into markdown hard breaks (two spaces + newline)
  // while preserving fenced code blocks. This is a light-weight preprocessor.
  const convertSingleNewlinesToHardBreaks = (text: string) => {
    if (!text) return text;
    const lines = text.split(/\n/);
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (!inFence) {
        // if next line is not empty, and current line is not empty, make it a hard break
        const next = lines[i + 1];
        if (next !== undefined && next.trim() !== "" && line.trim() !== "") {
          lines[i] = line + "  "; // markdown hard break
        }
      }
    }
    return lines.join("\n");
  };

  if (!note) {
    return <div className="p-8">No note</div>;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold mb-1">{note.title}</h1>
          {note.createdAt && (
            <p className="text-sm text-gray-500 mb-2">
              Created: {new Date(note.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center">
          <Button onClick={() => router.push("/notes/new")} className="ml-4">
            New note
          </Button>
        </div>
      </div>

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
      {frontmatter && (
        <div className="mb-4 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(frontmatter).map(([k, v]) => {
                const val = String(v ?? "");
                return (
                  <tr
                    key={k}
                    role="button"
                    tabIndex={0}
                    onClick={() => copyToClipboard(k, val)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        copyToClipboard(k, val);
                      }
                    }}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                  >
                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 w-1/3">
                      {k}
                    </td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                      <div className="relative">
                        <span className="block pr-12 break-words">{val}</span>
                        <button
                          type="button"
                          aria-hidden
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 pointer-events-none z-10"
                        >
                          {/* copy icon (simple) */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            ></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <div className="prose dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {convertSingleNewlinesToHardBreaks(note.body)}
          </ReactMarkdown>
        </div>
      </Card>

      {/* Mobile FAB (use same styles as Quicklists MobileCreatePanel) */}
      <Button
        size="fab"
        aria-label="New note"
        title="New note"
        className="md:hidden fixed z-[300] shadow-lg hover:shadow-xl active:scale-95"
        style={{
          right: "1rem",
          bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          WebkitAppearance: "none",
          appearance: "none",
          minWidth: 56,
          minHeight: 56,
          maxWidth: 56,
          maxHeight: 56,
        }}
        onClick={() => router.push("/notes/new")}
      >
        <Plus className="h-7 w-7" />
      </Button>
    </main>
  );
}
