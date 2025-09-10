"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = { bucket: string; uuid: string };

export default function NoteView({ bucket, uuid }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ title: string; body: string } | null>(
    null
  );
  const router = useRouter();

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
        if (!cancelled) setNote({ title: data.title, body: data.body });
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
  if (!note) {
    return <div className="p-8">No note</div>;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{note.title}</h1>
      <div className="prose dark:prose-invert whitespace-pre-wrap">
        {note.body}
      </div>
    </main>
  );
}
