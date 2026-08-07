"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/42go/layouts/app";
import { PlainList, PlainListItem } from "@/42go/components/PlainList";
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
  type ConversationCategoryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

const CategoryPage = () => {
  const params = useParams<{ categoryPath: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      setData((await response.json()) as ConversationCategoryResponse);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Could not load this category.");
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
  const returnTo = buildBandHref(pathname, band);

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

  return (
    <AppLayout
      title={data?.category.title ?? "Conversations"}
      actions={data ? [{
        type: "component",
        component: LanguagePreferencesMenu,
        props: {
          targetLanguage: data.profile.targetLanguage,
          band,
          onSaved: preferenceSaved,
        },
      }] : []}
      backBtn={{ to: categoryPath.length > 1
        ? `/conversations/categories/${categoryPath.slice(0, -1).map(encodeURIComponent).join("/")}?${new URLSearchParams({ band })}`
        : buildBandHref("/conversations", band) }}
      stickyHeader
      containedMobileScroll
      policy={CONVERSATIONS_POLICY}
    >
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {error ? <ConversationError message={error} onRetry={() => void load()} /> : null}
        {loading && !data ? <ConversationLoading label="Loading category…" /> : null}

        {data ? (
          <>
            {data.category.goal || data.category.description ? (
            <header className="space-y-2">
              {data.category.goal ? (
                <p className="font-medium text-foreground">{data.category.goal}</p>
              ) : null}
              {data.category.description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {data.category.description}
                </p>
              ) : null}
            </header>
            ) : null}

            {data.children.length > 0 ? (
              <section aria-labelledby="subcategories-heading" className="space-y-3">
                <h2 id="subcategories-heading" className="text-lg font-semibold">Explore further</h2>
                <CategoryList
                  categories={data.children}
                  bottomMargin={0}
                  getHref={(child) => `/conversations/categories/${[...categoryPath, child.id].map(encodeURIComponent).join("/")}?${new URLSearchParams({ band })}`}
                />
              </section>
            ) : null}

            {data.scenarios.length > 0 || data.children.length === 0 ? (
              <section aria-labelledby="practice-heading" className="space-y-4">
                <div>
                  <h2 id="practice-heading" className="text-lg font-semibold">Choose a conversation</h2>
                  <p className="text-sm text-muted-foreground">Choose the exact level you want to open.</p>
                </div>
                {data.scenarios.length === 0 ? (
                  <ConversationEmpty title="No conversations at this level" description="Try another practice level. Conversations from another language or level are never substituted automatically." />
                ) : (
                  <div className="space-y-6">
                    {data.scenarios.map((scenario) => {
                      return (
                      <article key={scenario.id} className="space-y-3">
                        <h3 className="font-semibold">
                          {scenario.canonicalTitle ?? scenario.title}
                        </h3>
                        {scenario.variants.map((variant) => (
                          <div key={variant.id} className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              {variant.canonicalTitle ?? variant.title}
                            </h4>
                            <PlainList>
                              {[...variant.choices]
                                .sort((a, b) => ["a1", "a2", "b1", "b2"].indexOf(a.cefrLevel) - ["a1", "a2", "b1", "b2"].indexOf(b.cefrLevel))
                                .map((choice) => (
                                  <PlainListItem key={choice.id}>
                                    <ConversationChoiceRow
                                      choice={choice}
                                      href={buildConversationHref({ id: choice.id, band, returnTo })}
                                    />
                                  </PlainListItem>
                                ))}
                            </PlainList>
                          </div>
                        ))}
                      </article>
                    )})}
                  </div>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default CategoryPage;
