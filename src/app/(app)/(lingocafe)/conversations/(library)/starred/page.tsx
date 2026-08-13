"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { PlainList, PlainListItem } from "@/42go/components/PlainList";
import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import {
  ConversationChoiceRow,
  ConversationEmpty,
  ConversationError,
  ConversationListSkeleton,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  buildConversationHref,
  type ConversationDiscoveryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { useConversationBrowseData } from "@/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData";

const StarredConversationsPage = () => {
  const pathname = usePathname();
  const {
    cacheScope,
    preferenceRevision,
    reportNavigation,
    reportProfile,
  } = useConversationLibraryShell();
  const apiHref = useMemo(() => "/api/lingocafe/conversations", []);

  const receiveData = useCallback(
    (payload: ConversationDiscoveryResponse) => reportProfile(payload.profile),
    [reportProfile]
  );
  const {
    data,
    error,
    loading,
    reload,
  } = useConversationBrowseData<ConversationDiscoveryResponse>({
    apiHref,
    cacheScope,
    revision: preferenceRevision,
    fallbackError: "Could not load starred conversations.",
    onData: receiveData,
  });

  const rootHref = "/conversations";
  const currentHref = pathname;

  useEffect(() => {
    reportNavigation({ title: "Starred", backTo: rootHref });
  }, [reportNavigation, rootHref]);

  return (
    <div className="mx-auto w-full max-w-4xl md:px-6">
      {error ? (
        <div className="px-6 pt-6 md:px-0">
          <ConversationError message={error} onRetry={() => void reload()} />
        </div>
      ) : null}
      {loading && !data ? <ConversationListSkeleton /> : null}
      {data ? (
        data.starred.length > 0 ? (
          <section aria-label="Starred conversations">
            <PlainList
              bleedMobile={false}
              hideMobileTopBorder
              hideMobileBottomBorder
              desktopVariant="contained"
            >
              {data.starred.map((choice) => (
                <PlainListItem key={choice.id}>
                  <ConversationChoiceRow
                    choice={choice}
                    href={buildConversationHref({ id: choice.id, returnTo: currentHref })}
                    showContext
                  />
                </PlainListItem>
              ))}
            </PlainList>
          </section>
        ) : (
          <div className="px-6 pt-6 md:px-0">
            <ConversationEmpty
              title="No starred conversations"
              description="Star a conversation to keep it here."
            />
          </div>
        )
      ) : null}
    </div>
  );
};

export default StarredConversationsPage;
