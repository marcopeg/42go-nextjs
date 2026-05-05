"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { ProfileBlock } from "@/42go/components/ProfileBlock/ProfileBlock";
import type {
  TProfileBlockHandle,
  TProfileBlockItem,
  TProfilePageRendererHandle,
  TProfileSaveSummary,
} from "@/42go/components/ProfileBlock/types";

const defaultProfileItems: TProfileBlockItem[] = [
  { type: "AccountInfo" },
  { type: "TestRBAC" },
  { type: "Logout" },
];

type ProfileFeedback =
  | { type: "success"; message: string }
  | { type: "error"; message: string; errors?: string[] };

type ProfilePageRendererProps = {
  items?: readonly TProfileBlockItem[];
  onSavingChange?: (saving: boolean) => void;
};

export const getDefaultProfileItems = () => defaultProfileItems;

export const ProfilePageRenderer = forwardRef<
  TProfilePageRendererHandle,
  ProfilePageRendererProps
>(({ items, onSavingChange }, ref) => {
  const handlesRef = useRef(new Map<string, TProfileBlockHandle>());
  const [feedback, setFeedback] = useState<ProfileFeedback | null>(null);
  const profileItems = items && items.length > 0 ? items : defaultProfileItems;

  const registerBlock = useCallback(
    (blockId: string, handle: TProfileBlockHandle) => {
      handlesRef.current.set(blockId, handle);

      return () => {
        handlesRef.current.delete(blockId);
      };
    },
    []
  );

  const save = useCallback(async (): Promise<TProfileSaveSummary> => {
    onSavingChange?.(true);
    setFeedback(null);

    try {
      const handles = Array.from(handlesRef.current.entries());
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

      const persistResults = [];
      for (const [blockId, handle] of handles) {
        persistResults.push({
          blockId,
          result: await (handle.persist?.() ?? { ok: true }),
        });
      }
      const persistErrors = persistResults
        .filter(({ result }) => !result.ok)
        .flatMap(({ result }) => (result.ok ? [] : [result.message]));

      if (persistErrors.length > 0) {
        const summary: TProfileSaveSummary = {
          ok: false,
          phase: "persistence",
          message: "Some profile sections could not be saved.",
          errors: persistErrors,
        };
        setFeedback({
          type: "error",
          message: summary.message,
          errors: summary.errors,
        });
        return summary;
      }

      const summary: TProfileSaveSummary = {
        ok: true,
        phase: "complete",
        message: "Preferences saved.",
      };
      setFeedback({ type: "success", message: summary.message });
      return summary;
    } finally {
      onSavingChange?.(false);
    }
  }, [onSavingChange]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  return (
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

      {profileItems.map((item, index) => (
        <ProfileBlock
          key={`${item.type}-${index}`}
          blockId={`${item.type}-${index}`}
          item={item}
          registerBlock={registerBlock}
        />
      ))}
    </div>
  );
});

ProfilePageRenderer.displayName = "ProfilePageRenderer";
