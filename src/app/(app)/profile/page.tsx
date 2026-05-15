"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AppLayout } from "@/42go/layouts/app";
import { useAppConfig, useAppID } from "@/42go/config/use-app-config";
import type { Policy } from "@/42go/policy/types";
import {
  ProfilePageRenderer,
  type TProfilePageRendererHandle,
  type TProfileSaveSummary,
} from "@/42go/components/ProfileBlock";
import { cn } from "@/lib/utils";

const PROFILE_PAGE_POLICY: Policy = {
  require: { session: true },
};

const MIN_SAVING_MS = 800;
const SAVED_MS = 3000;

type SaveActionPhase = "hidden" | "save" | "saving" | "saved" | "keep";

type ReaderBookSummary = {
  title?: unknown;
  readingAction?: {
    kind?: unknown;
    href?: unknown;
    updatedAt?: unknown;
  };
};

type SavePreferencesActionProps = {
  saving: boolean;
  dirty: boolean;
  dirtyVersion: number;
  onValidate: () => Promise<TProfileSaveSummary | null>;
  onSave: () => Promise<TProfileSaveSummary>;
  onContinue: () => void | Promise<void>;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const getReadingActionTime = (book: ReaderBookSummary) => {
  const updatedAt = book.readingAction?.updatedAt;
  if (typeof updatedAt !== "string") return 0;

  const time = new Date(updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getLastReadingHref = async () => {
  const res = await fetch("/api/lingocafe/books", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return "/books";

  const payload = (await res.json().catch(() => null)) as {
    books?: unknown;
  } | null;
  const books = Array.isArray(payload?.books)
    ? (payload.books as ReaderBookSummary[])
    : [];
  const latest = books
    .filter((book) => {
      const href = book.readingAction?.href;
      return (
        book.readingAction?.kind === "resume" &&
        typeof href === "string" &&
        href.startsWith("/books/")
      );
    })
    .sort(
      (left, right) => getReadingActionTime(right) - getReadingActionTime(left)
    )[0];
  const href = latest?.readingAction?.href;

  return typeof href === "string" ? href : "/books";
};

const SavePreferencesAction = ({
  saving,
  dirty,
  dirtyVersion,
  onValidate,
  onSave,
  onContinue,
}: SavePreferencesActionProps) => {
  const [phase, setPhase] = useState<SaveActionPhase>("hidden");
  const [savedDirtyVersion, setSavedDirtyVersion] = useState<number | null>(
    null
  );
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, ms: number) => {
    const timer: number = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      callback();
    }, ms);

    timersRef.current.push(timer);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const showSavedSequence = useCallback(() => {
    clearTimers();
    setSavedDirtyVersion(dirtyVersion);
    setPhase("saved");
    schedule(() => setPhase("keep"), SAVED_MS);
  }, [clearTimers, dirtyVersion, schedule]);

  const isSuccessPhase = phase === "saved" || phase === "keep";
  const successIsCurrent =
    isSuccessPhase && (!dirty || savedDirtyVersion === dirtyVersion);
  const activePhase = successIsCurrent
    ? phase
    : saving || phase === "saving"
      ? "saving"
      : dirty
        ? "save"
        : "hidden";

  const handleClick = async () => {
    if (activePhase === "saved" || activePhase === "keep") {
      void onContinue();
      return;
    }

    if (activePhase === "saving") return;

    const validationSummary = await onValidate();
    if (validationSummary) return;

    clearTimers();
    setSavedDirtyVersion(null);
    setPhase("saving");

    const startedAt = performance.now();
    const summary = await onSave();
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_SAVING_MS - elapsed);

    if (remaining > 0) await wait(remaining);

    if (!summary.ok) {
      if (dirty) {
        setPhase("save");
      } else {
        setPhase("hidden");
        setSavedDirtyVersion(null);
      }
      return;
    }

    showSavedSequence();
  };

  if (activePhase === "hidden") return null;

  const disabled = activePhase === "saving";
  const label =
    activePhase === "saved"
      ? "Saved 🎉"
      : activePhase === "keep"
        ? "Keep Reading!"
        : activePhase === "saving"
          ? "Saving"
          : "Save";

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      className={cn(
        "min-w-32 transition-all duration-200 ease-out",
        "animate-in fade-in-0 zoom-in-95"
      )}
    >
      {activePhase === "saving" && (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      )}
      {label}
    </Button>
  );
};

export default function ProfilePage() {
  const config = useAppConfig();
  const appID = useAppID();
  const router = useRouter();
  const rendererRef = useRef<TProfilePageRendererHandle>(null);
  const [saving, setSaving] = useState(false);
  const [dirtyState, setDirtyState] = useState({
    dirty: false,
    version: 0,
  });

  const handleDirtyChange = useCallback((nextDirty: boolean) => {
    setDirtyState((current) => {
      if (current.dirty === nextDirty) return current;

      return {
        dirty: nextDirty,
        version: nextDirty ? current.version + 1 : current.version,
      };
    });
  }, []);

  const handleValidate = useCallback(async () => {
    return rendererRef.current?.validate() ?? null;
  }, []);

  const handleSave = useCallback(async (): Promise<TProfileSaveSummary> => {
    return (
      rendererRef.current?.save({ skipValidation: true }) ?? {
        ok: false,
        phase: "persistence",
        message: "Could not save profile.",
        errors: ["Profile page is not ready."],
      }
    );
  }, []);

  const handleContinue = useCallback(async () => {
    if (appID === "lingocafe") {
      try {
        router.push(await getLastReadingHref());
      } catch {
        router.push("/books");
      }
      return;
    }

    router.push(config?.app?.default?.page || "/");
  }, [appID, config?.app?.default?.page, router]);

  return (
    <AppLayout
      title="Profile"
      stickyHeader={true}
      policy={PROFILE_PAGE_POLICY}
      actions={[
        {
          type: "component",
          component: SavePreferencesAction,
          props: {
            saving,
            dirty: dirtyState.dirty,
            dirtyVersion: dirtyState.version,
            onValidate: handleValidate,
            onSave: handleSave,
            onContinue: handleContinue,
          },
        },
      ]}
    >
      <ProfilePageRenderer
        ref={rendererRef}
        profile={config?.app?.profile}
        consent={config?.app?.consent}
        onSavingChange={setSaving}
        onDirtyChange={handleDirtyChange}
      />
    </AppLayout>
  );
}
