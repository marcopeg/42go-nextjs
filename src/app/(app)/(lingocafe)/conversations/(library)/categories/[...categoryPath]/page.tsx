"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { PlainListItem } from "@/42go/components/PlainList";
import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import { useConversationBrowseData } from "@/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData";
import {
  ConversationChoiceGroupRow,
  CategoryList,
  ConversationEmpty,
  ConversationError,
  ConversationListSkeleton,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  buildBandHref,
  buildConversationHref,
  isConversationBand,
  type ConversationBand,
  type ConversationCategoryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

const CategoryPage = () => {
  const params = useParams<{ categoryPath: string[] }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    cacheScope,
    navigateToCategory,
    preferenceRevision,
    reportNavigation,
    reportProfile,
  } = useConversationLibraryShell();
  const requestedBand = searchParams.get("band");
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

  const receiveData = useCallback(
    (payload: ConversationCategoryResponse) => reportProfile(payload.profile),
    [reportProfile]
  );
  const { data, error, loading, reload } =
    useConversationBrowseData<ConversationCategoryResponse>({
      apiHref,
      cacheScope,
      revision: preferenceRevision,
      fallbackError: "Could not load this category.",
      onData: receiveData,
    });

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

  useEffect(() => {
    if (!data) return;
    reportNavigation({
      title: data.category.title,
      backTo: parentHref,
    });
  }, [data, parentHref, reportNavigation]);

  return (
      <div className="mx-auto w-full max-w-4xl md:px-6">
        {error ? (
          <div className="px-6 pt-6 md:px-0">
            <ConversationError message={error} onRetry={() => void reload()} />
          </div>
        ) : null}
        {loading && !data ? (
          <ConversationListSkeleton />
        ) : null}

        {data ? (
          <>
            {data.children.length > 0 || conversationGroups.length > 0 ? (
              <section
                aria-label={
                  data.children.length > 0
                    ? "Subcategories and conversations"
                    : "Conversations"
                }
              >
                <CategoryList
                  categories={data.children}
                  getHref={(child) => `/conversations/categories/${[...categoryPath, child.id].map(encodeURIComponent).join("/")}?${new URLSearchParams({ band })}`}
                  onNavigate={(child, href) => navigateToCategory({
                    href,
                    title: child.title,
                    backTo: returnTo,
                  })}
                  trailingItems={
                    <>
                      {conversationGroups.map((group) => (
                        <PlainListItem key={group.id}>
                          <ConversationChoiceGroupRow
                            choices={group.choices}
                            getHref={(choice) =>
                              buildConversationHref({
                                id: choice.id,
                                band,
                                returnTo,
                              })
                            }
                          />
                        </PlainListItem>
                      ))}
                    </>
                  }
                />
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
