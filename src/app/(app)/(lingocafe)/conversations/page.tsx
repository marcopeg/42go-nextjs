"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AppLayout } from "@/42go/layouts/app";
import {
  PlainList,
  PlainListItem,
} from "@/42go/components/PlainList";
import {
  LanguagePreferencesMenu,
  type LanguagePreferencePatch,
} from "@/app/(app)/(lingocafe)/_components/LanguagePreferencesMenu";
import {
  ConversationChoiceRow,
  CategoryList,
  ConversationEmpty,
  ConversationError,
  ConversationLoading,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  CONVERSATIONS_POLICY,
  buildBandHref,
  buildConversationHref,
  getResponseMessage,
  isConversationBand,
  type ConversationBand,
  type ConversationChoice,
  type ConversationDiscoveryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

const ConversationsPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBand = searchParams.get("band");
  const [data, setData] = useState<ConversationDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starPendingId, setStarPendingId] = useState<string | null>(null);

  const apiHref = useMemo(() => {
    const query = new URLSearchParams();
    if (isConversationBand(requestedBand)) query.set("band", requestedBand);
    const encoded = query.toString();
    return `/api/lingocafe/conversations${encoded ? `?${encoded}` : ""}`;
  }, [requestedBand]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiHref, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, "Could not load conversations."));
      }
      const payload = (await response.json()) as ConversationDiscoveryResponse;
      setData(payload);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Could not load conversations.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiHref]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : data?.selection.band ?? "intermediate";
  const currentHref = buildBandHref(pathname, band);

  const preferenceSaved = (patch: LanguagePreferencePatch) => {
    if ("targetLevel" in patch) {
      const nextBand: ConversationBand = patch.targetLevel === "a1"
        ? "beginner"
        : patch.targetLevel === "b2"
          ? "advanced"
          : "intermediate";
      router.replace(buildBandHref(pathname, nextBand));
      return;
    }
    void load();
  };

  const toggleStar = async (choice: ConversationChoice) => {
    if (starPendingId) return;
    const nextStarred = !choice.isStarred;
    setStarPendingId(choice.id);
    setData((current) =>
      current
        ? {
            ...current,
            starred: nextStarred
              ? current.starred.map((item) =>
                  item.id === choice.id ? { ...item, isStarred: true } : item
                )
              : current.starred.filter((item) => item.id !== choice.id),
          }
        : current
    );

    try {
      const response = await fetch(
        `/api/lingocafe/conversations/${encodeURIComponent(choice.id)}/star`,
        { method: nextStarred ? "PUT" : "DELETE", credentials: "same-origin" }
      );
      if (!response.ok) throw new Error(await getResponseMessage(response, "Could not update star."));
    } catch (caught) {
      setData((current) =>
        current
          ? {
              ...current,
              starred: current.starred.map((item) =>
                item.id === choice.id ? { ...item, isStarred: choice.isStarred } : item
              ),
            }
          : current
      );
      setError(caught instanceof Error ? caught.message : "Could not update star.");
      void load();
    } finally {
      setStarPendingId(null);
    }
  };

  return (
    <AppLayout
      title="Conversations"
      subtitle="Pick an everyday situation to practice."
      actions={data ? [{
        type: "component",
        component: LanguagePreferencesMenu,
        props: {
          targetLanguage: data.profile.targetLanguage,
          band,
          onSaved: preferenceSaved,
        },
      }] : []}
      stickyHeader
      disablePadding
      policy={CONVERSATIONS_POLICY}
    >
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {error ? <ConversationError message={error} onRetry={() => void load()} /> : null}
        {loading && !data ? <ConversationLoading /> : null}

        {data ? (
          <>
            {data.starred.length > 0 ? (
              <section aria-labelledby="starred-conversations-heading" className="space-y-3">
                <div>
                  <h2 id="starred-conversations-heading" className="text-lg font-semibold">
                    Starred
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Saved conversations in {data.profile.targetLanguage.toUpperCase()}, across every level.
                  </p>
                </div>
                <PlainList>
                  {data.starred.map((choice) => (
                    <PlainListItem key={choice.id}>
                      <ConversationChoiceRow
                        choice={choice}
                        href={buildConversationHref({ id: choice.id, band, returnTo: currentHref })}
                        showContext
                        onStarChange={toggleStar}
                        starPending={starPendingId === choice.id}
                      />
                    </PlainListItem>
                  ))}
                </PlainList>
              </section>
            ) : null}

            <section aria-label="Conversation categories">
              {data.roots.length > 0 ? (
                <CategoryList
                  categories={data.roots}
                  flush
                  getHref={(category) =>
                    `/conversations/categories/${encodeURIComponent(category.id)}?${new URLSearchParams({ band }).toString()}`
                  }
                />
              ) : (
                <ConversationEmpty
                  title={`No ${data.profile.targetLanguage.toUpperCase()} conversations yet`}
                  description="Conversation practice is not available for this language. Nothing has been substituted from another language."
                />
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default ConversationsPage;
