"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import { useConversationBrowseData } from "@/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData";
import {
  CategoryList,
  ConversationEmpty,
  ConversationError,
  ConversationLoading,
  StarredConversationCategoryRow,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import { type ConversationDiscoveryResponse } from "@/app/(app)/(lingocafe)/conversations/_components/types";

const ConversationsPage = () => {
  const pathname = usePathname();
  const {
    cacheScope,
    navigateToCategory,
    preferenceRevision,
    reportNavigation,
    reportProfile,
  } = useConversationLibraryShell();
  const apiHref = useMemo(() => "/api/lingocafe/conversations", []);

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

  const currentHref = pathname;

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
                      href="/conversations/starred"
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
                  `/conversations/categories/${encodeURIComponent(category.id)}`
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
