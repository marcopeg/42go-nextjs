"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import { SimplePanel } from "@/42go/components/panel";
import { Button } from "@/components/ui/button";

type TokenStatus = {
  exists: boolean;
  prefix?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string | null;
};

type TokenResponse = {
  token: string;
  status: TokenStatus;
};

const readMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message || fallback;
};

export const QuickShareApiAccessPreferences = () => {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"create" | "rotate" | "disable" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/quickshare/api-access", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(await readMessage(response, "Could not load API access."));
        const payload = (await response.json()) as { status: TokenStatus };
        if (!cancelled) setStatus(payload.status);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load API access.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const createOrRotate = async (rotate: boolean) => {
    setBusy(rotate ? "rotate" : "create");
    setError(null);
    setCopied(false);
    setCopyError(null);

    try {
      const response = await fetch("/api/quickshare/api-access", {
        method: rotate ? "PUT" : "POST",
        credentials: "same-origin",
        headers: rotate ? { "content-type": "application/json" } : undefined,
        body: rotate ? JSON.stringify({ expectedUpdatedAt: status?.updatedAt }) : undefined,
      });
      if (!response.ok) {
        throw new Error(await readMessage(response, rotate ? "Could not rotate token." : "Could not create token."));
      }
      const payload = (await response.json()) as TokenResponse;
      setStatus(payload.status);
      setRawToken(payload.token);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : rotate
            ? "Could not rotate token."
            : "Could not create token."
      );
    } finally {
      setBusy(null);
    }
  };

  const disable = async () => {
    setBusy("disable");
    setError(null);
    try {
      const response = await fetch("/api/quickshare/api-access", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await readMessage(response, "Could not disable API access."));
      setStatus({ exists: false });
      setConfirmDisable(false);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not disable API access.");
    } finally {
      setBusy(null);
    }
  };

  const copyToken = async () => {
    if (!rawToken) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopied(true);
    } catch {
      setCopyError("Could not copy the token. Check clipboard permission and try again.");
    }
  };

  const closeDisclosure = () => {
    setRawToken(null);
    setCopied(false);
    setCopyError(null);
  };

  const enabled = Boolean(status?.exists);

  return (
    <>
      <SimplePanel
        title="QuickShare API access"
        description={
          enabled
            ? "Your personal bearer token is active. Rotate it to replace the credential, or disable access to revoke it immediately."
            : "Create a personal bearer token for trusted automation. It is shown only once and cannot be recovered later."
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading API access…</p>
        ) : (
          <div className="space-y-4">
            {enabled && (
              <div>
                <p className="text-sm font-medium">Personal API token</p>
                <p className="text-sm text-muted-foreground">
                  Active token {status?.prefix || "qs_"}••••••••
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="status">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {!enabled ? (
                <Button type="button" onClick={() => void createOrRotate(false)} disabled={busy !== null}>
                  <KeyRound />
                  {busy === "create" ? "Creating…" : "Create API token"}
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => void createOrRotate(true)} disabled={busy !== null}>
                    <RefreshCw />
                    {busy === "rotate" ? "Rotating…" : "Rotate token"}
                  </Button>
                  <Button type="button" variant="destructiveOutline" onClick={() => setConfirmDisable(true)} disabled={busy !== null}>
                    <Trash2 />
                    Disable API access
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SimplePanel>

      <Modal
        open={rawToken !== null}
        onOpenChange={(open) => {
          if (!open) closeDisclosure();
        }}
        title="Store your QuickShare token"
        subtitle="This is the only time QuickShare can show this token."
        size="md"
        closeOnOverlayClick={false}
        showClose={false}
        actions={
          <Button type="button" size="sm" onClick={closeDisclosure}>
            <Check />
            I stored it
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy this secret into your trusted automation setup. Anyone who has it can act as you in QuickShare.
          </p>
          <button
            type="button"
            className="block w-full rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            onClick={() => void copyToken()}
            aria-label="Copy QuickShare token to clipboard"
          >
            <code className="block break-all text-sm select-all">{rawToken}</code>
          </button>
          <Button type="button" variant="outline" onClick={() => void copyToken()}>
            <Copy />
            {copied ? "Copied" : "Copy token"}
          </Button>
          <p className="sr-only" aria-live="polite">
            {copied ? "QuickShare token copied to clipboard. You can now close this dialog." : ""}
          </p>
          {copyError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {copyError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Disable API access?"
        subtitle="Your active token will be revoked immediately."
        size="sm"
        footer={
          <>
            <Button type="button" variant="neutralLink" onClick={() => setConfirmDisable(false)} disabled={busy === "disable"}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void disable()} disabled={busy === "disable"}>
              {busy === "disable" ? "Disabling…" : "Revoke token"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Agents and scripts using this token stop immediately. Your QuickShare drafts and published shares stay unchanged.
        </p>
      </Modal>
    </>
  );
};
