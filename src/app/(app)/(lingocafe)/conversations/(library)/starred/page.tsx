"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { PlainList, PlainListItem } from "@/42go/components/PlainList";
import { useConversationLibraryShell } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell";
import {
  ConversationChoiceRow,
  ConversationEmpty,
  ConversationError,
  ConversationListSkeleton,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  buildBandHref,
  buildConversationHref,
  getResponseMessage,
  isConversationBand,
  type ConversationBand,
  type ConversationChoice,
  type ConversationDiscoveryResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { useConversationBrowseData } from "@/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData";

const StarredConversationsPage = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    cacheScope,
    preferenceRevision,
    reportNavigation,
    reportProfile,
  } = useConversationLibraryShell();
  const requestedBand = searchParams.get("band");
  const [starPendingId, setStarPendingId] = useState<string | null>(null);

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
  const {
    data,
    error,
    loading,
    reload,
    setData,
    setError,
  } = useConversationBrowseData<ConversationDiscoveryResponse>({
    apiHref,
    cacheScope,
    revision: preferenceRevision,
    fallbackError: "Could not load starred conversations.",
    onData: receiveData,
  });

  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : data?.selection.band ?? "intermediate";
  const rootHref = buildBandHref("/conversations", band);
  const currentHref = buildBandHref(pathname, band);

  useEffect(() => {
    reportNavigation({ title: "Starred", backTo: rootHref });
  }, [reportNavigation, rootHref]);

  const toggleStar = async (choice: ConversationChoice) => {
    if (starPendingId) return;
    setStarPendingId(choice.id);
    setData((current) => current
      ? { ...current, starred: current.starred.filter((item) => item.id !== choice.id) }
      : current);

    try {
      const response = await fetch(
        `/api/lingocafe/conversations/${encodeURIComponent(choice.id)}/star`,
        { method: "DELETE", credentials: "same-origin" }
      );
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, "Could not remove star."));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove star.");
      void reload();
    } finally {
      setStarPendingId(null);
    }
  };

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
                    href={buildConversationHref({ id: choice.id, band, returnTo: currentHref })}
                    showContext
                    onStarChange={toggleStar}
                    starPending={starPendingId === choice.id}
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
