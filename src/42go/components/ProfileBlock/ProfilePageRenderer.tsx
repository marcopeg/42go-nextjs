"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { ProfileBlock } from "@/42go/components/ProfileBlock/ProfileBlock";
import type {
  TProfileBlockHandle,
  TProfileBlockItem,
  TProfileConfig,
  TProfilePageRendererHandle,
  TProfileSaveSummary,
} from "@/42go/components/ProfileBlock/types";
import type { TConsentConfig } from "@/42go/profile";
import {
  ProfileProvider,
  useProfileController,
} from "@/42go/profile/client";

const defaultProfileItems: TProfileBlockItem[] = [];

type ProfileFeedback =
  | { type: "success"; message: string }
  | { type: "error"; message: string; errors?: string[] };

type ProfilePageRendererProps = {
  profile?: TProfileConfig | null;
  consent?: TConsentConfig | null;
  onSavingChange?: (saving: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export const getDefaultProfileItems = () => defaultProfileItems;

export const ProfilePageRenderer = forwardRef<
  TProfilePageRendererHandle,
  ProfilePageRendererProps
>(({ profile, consent, onSavingChange, onDirtyChange }, ref) => {
  const handlesRef = useRef(new Map<string, TProfileBlockHandle>());
  const [feedback, setFeedback] = useState<ProfileFeedback | null>(null);
  const [blockDirtyState, setBlockDirtyState] = useState<Record<string, boolean>>(
    {}
  );
  const externalDirty = useMemo(
    () => Object.values(blockDirtyState).some(Boolean),
    [blockDirtyState]
  );
  const controller = useProfileController({
    profile,
    consent,
    onSavingChange,
    onDirtyChange,
    externalDirty,
  });
  const profileItems =
    profile?.items && profile.items.length > 0
      ? profile.items
      : defaultProfileItems;

  const registerBlock = useCallback(
    (blockId: string, handle: TProfileBlockHandle) => {
      handlesRef.current.set(blockId, handle);

      return () => {
        handlesRef.current.delete(blockId);
        setBlockDirtyState((current) => {
          if (!(blockId in current)) return current;

          const next = { ...current };
          delete next[blockId];
          return next;
        });
      };
    },
    []
  );

  const setBlockDirty = useCallback((blockId: string, dirty: boolean) => {
    setBlockDirtyState((current) => {
      const previous = current[blockId] ?? false;
      if (previous === dirty) return current;

      if (!dirty) {
        if (!(blockId in current)) return current;

        const next = { ...current };
        delete next[blockId];
        return next;
      }

      return {
        ...current,
        [blockId]: true,
      };
    });
  }, []);

  const save = useCallback(async (): Promise<TProfileSaveSummary> => {
    setFeedback(null);
    const handles = Array.from(handlesRef.current.entries());

    try {
      const validations = await Promise.all(
        handles.map(async ([blockId, handle]) => ({
          blockId,
          result: await (handle.validate?.() ?? { ok: true }),
        }))
      );
      const validationErrors = validations
        .filter(({ result }) => !result.ok)
        .flatMap(({ result }) => (result.ok ? [] : [result.message]));

      if (validationErrors.length > 0) {
        const summary: TProfileSaveSummary = {
          ok: false,
          phase: "validation",
          message: "Fix the highlighted profile errors before saving.",
          errors: validationErrors,
        };
        setFeedback({
          type: "error",
          message: summary.message,
          errors: summary.errors,
        });
        return summary;
      }

      if (!controller.validate()) {
        const summary: TProfileSaveSummary = {
          ok: false,
          phase: "validation",
          message: "Fix the highlighted profile errors before saving.",
          errors: controller.errors.map((error) => error.message),
        };
        setFeedback({
          type: "error",
          message: summary.message,
          errors: summary.errors,
        });
        return summary;
      }

      const consentBlock = profileItems.find((item) => item.type === "Consent");
      await controller.save({
        source:
          consentBlock && "source" in consentBlock
            ? consentBlock.source
            : undefined,
        method:
          consentBlock && "method" in consentBlock
            ? consentBlock.method
            : undefined,
      });

      const summary: TProfileSaveSummary = {
        ok: true,
        phase: "complete",
        message: "Preferences saved.",
      };
      setFeedback({ type: "success", message: summary.message });
      await Promise.all(
        handles.map(([, handle]) => handle.onSaveSuccess?.() ?? undefined)
      );
      return summary;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save profile.";
      const summary: TProfileSaveSummary = {
        ok: false,
        phase: "persistence",
        message,
        errors:
          controller.errors.length > 0
            ? controller.errors.map((item) => item.message)
            : [message],
      };
      setFeedback({
        type: "error",
        message: summary.message,
        errors: summary.errors,
      });
      await Promise.all(
        handles.map(([, handle]) => handle.onSaveError?.(summary) ?? undefined)
      );
      return summary;
    }
  }, [controller, profileItems]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  return (
    <ProfileProvider controller={controller}>
      <div className="space-y-6">
        {feedback && (
          <div
            className={
              feedback.type === "success"
                ? "rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-300"
                : "rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            <p>{feedback.message}</p>
            {feedback.type === "error" &&
              feedback.errors &&
              feedback.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {feedback.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {controller.loading ? (
          <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading profile...
          </div>
        ) : profileItems.length > 0 ? (
          profileItems.map((item, index) => (
            <ProfileBlock
              key={`${item.type}-${index}`}
              blockId={`${item.type}-${index}`}
              item={item}
              registerBlock={registerBlock}
              setBlockDirty={setBlockDirty}
            />
          ))
        ) : (
          <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
            No profile blocks are configured.
          </div>
        )}

        {controller.isDirty && (
          <p className="text-sm text-muted-foreground">Unsaved changes.</p>
        )}
      </div>
    </ProfileProvider>
  );
});

ProfilePageRenderer.displayName = "ProfilePageRenderer";
