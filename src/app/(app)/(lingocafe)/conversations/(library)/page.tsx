"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import { useConversationBrowseData } from "@/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData";
import {
  CategoryList,
  ConversationEmpty,
  ConversationError,
  ConversationLoading,
  StarredConversationCategoryRow,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  buildBandHref,
  isConversationBand,
  type ConversationBand,
  type ConversationDiscoveryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

const ConversationsPage = () => {
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

  const apiHref = useMemo(() => {
    const query = new URLSearchParams();
    if (isConversationBand(requestedBand)) query.set("band", requestedBand);
    const encoded = query.toString();
    return `/api/lingocafe/conversations${encoded ? `?${encoded}` : ""}`;
  }, [requestedBand]);

  const receiveData = useCallback(
    (payload: ConversationDiscoveryResponse) => reportProfile(payload.profile),
    [reportProfile]
  );
  const { data, error, loading, reload } =
    useConversationBrowseData<ConversationDiscoveryResponse>({
      apiHref,
      cacheScope,
      revision: preferenceRevision,
      fallbackError: "Could not load conversations.",
      onData: receiveData,
    });

  useEffect(() => {
    reportNavigation({
      title: "Conversations",
      subtitle: "Pick an everyday situation to practice.",
    });
  }, [reportNavigation]);

  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : data?.selection.band ?? "intermediate";
  const currentHref = buildBandHref(pathname, band);

  return (
      <div className="mx-auto w-full max-w-4xl md:px-6">
        {error ? (
          <div className="px-6 pt-6 md:px-0">
            <ConversationError message={error} onRetry={() => void reload()} />
          </div>
        ) : null}
        {loading && !data ? (
          <div className="px-6 pt-6 md:px-0">
            <ConversationLoading />
          </div>
        ) : null}

        {data ? (
          <section aria-label="Conversation categories">
            {data.roots.length > 0 || data.starred.length > 0 ? (
              <CategoryList
                categories={data.roots}
                leadingItems={
                  data.starred.length > 0 ? (
                    <StarredConversationCategoryRow
                      count={data.starred.length}
                      href={buildBandHref("/conversations/starred", band)}
                      onNavigate={(href) =>
                        navigateToCategory({
                          href,
                          title: "Starred",
                          backTo: currentHref,
                        })
                      }
                    />
                  ) : null
                }
                getHref={(category) =>
                  `/conversations/categories/${encodeURIComponent(category.id)}?${new URLSearchParams({ band }).toString()}`
                }
                onNavigate={(category, href) =>
                  navigateToCategory({
                    href,
                    title: category.title,
                    backTo: currentHref,
                  })
                }
              />
            ) : (
              <ConversationEmpty
                title={`No ${data.profile.targetLanguage.toUpperCase()} conversations yet`}
                description="Conversation practice is not available for this language. Nothing has been substituted from another language."
              />
            )}
          </section>
        ) : null}
      </div>
  );
};

export default ConversationsPage;
