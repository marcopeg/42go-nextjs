"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import { SimplePanel } from "@/42go/components/panel";
import { Button } from "@/components/ui/button";
import { createQuicklistConnectionCode } from "@/lib/quicklists/connection-code";

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

const readMessage = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as
    | { message?: string }
    | null;
  return payload?.message || fallback;
};

export const QuicklistApiAccessPreferences = () => {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"create" | "rotate" | "disable" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/quicklists/api-access", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await readMessage(res, "Could not load API access."));
        const payload = (await res.json()) as { status: TokenStatus };
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
      const res = await fetch("/api/quicklists/api-access", {
        method: rotate ? "PUT" : "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        throw new Error(await readMessage(res, rotate ? "Could not rotate token." : "Could not create token."));
      }
      const payload = (await res.json()) as TokenResponse;
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
      const res = await fetch("/api/quicklists/api-access", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(await readMessage(res, "Could not disable API access."));
      setStatus({ exists: false });
      setConfirmDisable(false);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not disable API access."
      );
    } finally {
      setBusy(null);
    }
  };

  const copyToken = async () => {
    if (!rawToken) return;
    setCopying(true);
    setCopyError(null);
    try {
      const connectionCode = createQuicklistConnectionCode(window.location.origin, rawToken);
      await navigator.clipboard.writeText(connectionCode);
      setCopied(true);
    } catch {
      setCopyError("Could not copy the setup code. Check clipboard permission and try again.");
    } finally {
      setCopying(false);
    }
  };

  const closeTokenDisclosure = () => {
    setRawToken(null);
    setCopied(false);
    setCopyError(null);
  };

  const handleTokenAction = () => {
    if (copied) {
      closeTokenDisclosure();
      return;
    }

    void copyToken();
  };

  const enabled = Boolean(status?.exists);

  return (
    <>
      <SimplePanel
        title="QuickList API access"
        description={
          enabled
            ? "Your personal bearer token is active. Rotate it to replace the current credential, or disable API access to delete it."
            : "Create a personal bearer token so the QuickList agent skill and other trusted tools can use lists you explicitly expose to the API. The token is shown only once."
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading API access…</p>
        ) : (
          <div className="space-y-4">
            {enabled && (
              <div className="min-w-0">
                <p className="text-sm font-medium">Personal API</p>
                <p className="text-sm text-muted-foreground">
                  Active token {status?.prefix || "ql"}••••••••
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {!enabled ? (
                <Button
                  type="button"
                  onClick={() => void createOrRotate(false)}
                  disabled={busy !== null}
                >
                  <KeyRound />
                  {busy === "create" ? "Creating…" : "Create API token"}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void createOrRotate(true)}
                    disabled={busy !== null}
                  >
                    <RefreshCw />
                    {busy === "rotate" ? "Rotating…" : "Rotate token"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    onClick={() => setConfirmDisable(true)}
                    disabled={busy !== null}
                  >
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
          if (!open && copied) closeTokenDisclosure();
        }}
        title="Copy your QuickList token"
        subtitle="This token is shown once. Store it safely before closing."
        size="md"
        closeOnOverlayClick={false}
        showClose={false}
        actions={
          <Button
            type="button"
            size="sm"
            onClick={handleTokenAction}
            disabled={copying}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Done" : copying ? "Copying…" : "Copy token"}
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy packages this token and the current QuickList URL into one setup code for the skill. It is not encrypted, so store it safely.
          </p>
          <button
            type="button"
            className="block w-full rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            onClick={() => void copyToken()}
            disabled={copying}
            aria-label={copied ? "QuickList setup code copied" : "Copy QuickList setup code to clipboard"}
          >
            <code className="block break-all text-sm select-all">{rawToken}</code>
          </button>
          <p className="sr-only" aria-live="polite">
            {copied ? "QuickList setup code copied to clipboard. Choose Done to close." : ""}
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
        subtitle="Your current token will be deleted immediately. Per-list API settings will stay unchanged."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="neutralLink"
              onClick={() => setConfirmDisable(false)}
              disabled={busy === "disable"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void disable()}
              disabled={busy === "disable"}
            >
              {busy === "disable" ? "Disabling…" : "Delete token and disable"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Agents and scripts using this token will stop working. You will need to create a new token to enable API access again.
        </p>
      </Modal>
    </>
  );
};
