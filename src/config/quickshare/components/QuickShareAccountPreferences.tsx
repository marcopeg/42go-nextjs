"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/42go/components/modal";
import { FormEvent, useEffect, useState } from "react";

type HandlePreview = {
  available: boolean;
  normalizedHandle: string;
  currentHandle: string;
  affectedCustomUrlCount: number;
  reason: string | null;
};

export const QuickShareAccountPreferences = () => {
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [requestedHandle, setRequestedHandle] = useState("");
  const [preview, setPreview] = useState<HandlePreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/quickshare", { credentials: "same-origin" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => setCurrentHandle(payload?.account?.handle ?? null));
  }, []);

  if (!currentHandle) return null;

  const previewChange = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/quickshare/handle", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: requestedHandle }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not check the handle.");
      setPreview(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not check the handle."); }
    finally { setBusy(false); }
  };

  const confirmChange = async () => {
    if (!preview?.available) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/quickshare/handle", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: preview.normalizedHandle, confirmed: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not change the handle.");
      setCurrentHandle(payload.account.handle); setRequestedHandle(""); setPreview(null); setMessage("QuickShare handle changed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not change the handle."); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div><h2 className="font-semibold">QuickShare handle</h2><p className="text-sm text-muted-foreground">Current handle: {currentHandle}</p></div>
      {message && <p className="text-sm" role="status">{message}</p>}
      <form onSubmit={previewChange} className="flex flex-col gap-2 sm:flex-row">
        <input aria-label="New QuickShare handle" value={requestedHandle} onChange={(event) => setRequestedHandle(event.target.value)} className="h-9 rounded-md border bg-background px-3" placeholder="new-handle" required />
        <Button type="submit" variant="outline" disabled={busy}>Check handle</Button>
      </form>
      {preview && <div className="space-y-2 rounded-md bg-muted p-3 text-sm"><p>{preview.available ? `@${preview.normalizedHandle} is available.` : preview.reason ?? "That handle is unavailable."}</p>{preview.available && <><p className="text-destructive">This changes {preview.affectedCustomUrlCount} custom public URL{preview.affectedCustomUrlCount === 1 ? "" : "s"}. Old URLs do not redirect.</p><Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmOpen(true)}>I understand, change handle</Button></>}</div>}
      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} title="Change your QuickShare handle" subtitle={`This disruptive action changes every custom URL from ${currentHandle} to ${preview?.normalizedHandle ?? "the new handle"}.`} size="sm" footer={<div className="flex justify-end gap-2"><Button type="button" variant="neutralLink" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={busy} onClick={() => { setConfirmOpen(false); void confirmChange(); }}>Change handle</Button></div>}><p className="text-sm text-muted-foreground">Old URLs stop working immediately. There are no redirects or backward compatibility.</p></Modal>
    </section>
  );
};
