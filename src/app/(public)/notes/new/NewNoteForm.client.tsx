"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export default function NewNoteForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and body are required",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast({
          title: "Create failed",
          description: j.message || j.error || `Status ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      const data = await res.json();
      if (!data || !data.bucket || !data.uuid) {
        toast({
          title: "Create failed",
          description: "Invalid response from server",
          variant: "destructive",
        });
        return;
      }
      // Redirect to the note view
      router.push(
        `/notes/${encodeURIComponent(data.bucket)}/${encodeURIComponent(
          data.uuid
        )}`
      );
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to create note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create note</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Body</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Write your note"
          />
        </div>
        <div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create note"}
          </Button>
        </div>
      </form>
    </main>
  );
}
