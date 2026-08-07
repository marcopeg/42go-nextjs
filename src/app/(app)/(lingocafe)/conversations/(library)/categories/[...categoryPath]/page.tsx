"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PlainList, PlainListItem } from "@/42go/components/PlainList";
import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import {
  ConversationChoiceGroupRow,
  CategoryList,
  ConversationEmpty,
  ConversationError,
  ConversationLoading,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  buildBandHref,
  buildConversationHref,
  getResponseMessage,
  isConversationBand,
  type ConversationBand,
  type ConversationCategoryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

const CategoryPage = () => {
  const params = useParams<{ categoryPath: string[] }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { preferenceRevision, reportProfile } = useConversationLibraryShell();
  const requestedBand = searchParams.get("band");
  const [data, setData] = useState<ConversationCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categoryPath = useMemo(
    () => (Array.isArray(params.categoryPath) ? params.categoryPath : []),
    [params.categoryPath]
  );

  const apiHref = useMemo(() => {
    const encodedPath = categoryPath.map(encodeURIComponent).join("/");
    const query = new URLSearchParams();
    if (isConversationBand(requestedBand)) query.set("band", requestedBand);
    return `/api/lingocafe/conversations/categories/${encodedPath}${query.size ? `?${query}` : ""}`;
  }, [categoryPath, requestedBand]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiHref, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, "Could not load this category."));
      const payload = (await response.json()) as ConversationCategoryResponse;
      setData(payload);
      reportProfile(payload.profile);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Could not load this category.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiHref, reportProfile]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load, preferenceRevision]);

  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : data?.selection.band ?? "intermediate";
  const returnTo = buildBandHref(pathname, band);
  const conversationGroups = useMemo(
    () =>
      data?.scenarios.flatMap((scenario) =>
        scenario.variants
          .map((variant) => ({
            id: `${scenario.id}:${variant.id}`,
            choices: [...variant.choices].sort(
              (a, b) =>
                ["a1", "a2", "b1", "b2"].indexOf(a.cefrLevel) -
                ["a1", "a2", "b1", "b2"].indexOf(b.cefrLevel)
            ),
          }))
          .filter((group) => group.choices.length > 0)
      ) ?? [],
    [data?.scenarios]
  );

  const parentHref = categoryPath.length > 1
    ? `/conversations/categories/${categoryPath.slice(0, -1).map(encodeURIComponent).join("/")}?${new URLSearchParams({ band })}`
    : buildBandHref("/conversations", band);

  return (
      <div className="mx-auto w-full max-w-4xl pb-[30vw] md:px-6 md:pb-6">
        {error ? (
          <div className="px-6 pt-6 md:px-0">
            <ConversationError message={error} onRetry={() => void load()} />
          </div>
        ) : null}
        {loading && !data ? (
          <div className="px-6 pt-6 md:px-0">
            <ConversationLoading label="Loading category…" />
          </div>
        ) : null}

        {data ? (
          <>
            <div className="flex min-h-16 items-center gap-2 px-3 md:px-0 md:pt-4">
              <Link
                href={parentHref}
                aria-label="Back to parent category"
                className="flex size-11 touch-manipulation items-center justify-center rounded-md outline-none transition-colors duration-75 hover:bg-muted active:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </Link>
              <h2 className="min-w-0 flex-1 text-lg font-semibold leading-tight">
                {data.category.title}
              </h2>
            </div>

            {data.children.length > 0 ? (
              <section aria-label="Subcategories">
                <CategoryList
                  categories={data.children}
                  flush
                  bottomMargin={0}
                  getHref={(child) => `/conversations/categories/${[...categoryPath, child.id].map(encodeURIComponent).join("/")}?${new URLSearchParams({ band })}`}
                />
              </section>
            ) : null}

            {conversationGroups.length > 0 ? (
              <section aria-label="Conversations">
                <PlainList bleedMobile={false} className="md:rounded-none md:border-x-0">
                  {conversationGroups.map((group) => (
                    <PlainListItem key={group.id}>
                      <ConversationChoiceGroupRow
                        choices={group.choices}
                        getHref={(choice) => buildConversationHref({ id: choice.id, band, returnTo })}
                      />
                    </PlainListItem>
                  ))}
                </PlainList>
              </section>
            ) : data.children.length === 0 ? (
              <ConversationEmpty title="No conversations at this level" description="Try another practice level. Conversations from another language or level are never substituted automatically." />
            ) : null}
          </>
        ) : null}
      </div>
  );
};

export default CategoryPage;
