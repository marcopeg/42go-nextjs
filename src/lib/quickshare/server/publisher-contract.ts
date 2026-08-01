import "server-only";

import type { QuickShareReleaseBundle, QuickShareReleaseManifest } from "@/lib/quickshare/server/release-bundle";

/**
 * IF14 implements this boundary. Source data must never use delivery output as
 * its authority, and no caller may assume an operation was published until the
 * publisher has atomically activated it.
 */
export type QuickSharePublishProjection = {
  appId: string;
  accountId: string;
  resourceId: string;
  releaseId: string;
  draftRevision: number;
  createdBy: string;
  bundle: QuickShareReleaseBundle;
  previousPublishedIdentifier: QuickSharePublicIdentifier | null;
  nextPublishedIdentifier: QuickSharePublicIdentifier;
};

export type QuickSharePublicIdentifier =
  | { kind: "short"; shortCode: string }
  | { kind: "custom"; handle: string; customId: string };

export type QuickSharePublisher = {
  activate: (projection: QuickSharePublishProjection) => Promise<{ manifest: QuickShareReleaseManifest; rollback: () => Promise<void> }>;
  purge: (input: {
    appId: string;
    accountId: string;
    resourceId: string;
    identifier: QuickSharePublicIdentifier | null;
  }) => Promise<{ finalize: () => Promise<void>; rollback: () => Promise<void> }>;
  renameAccountFolder: (input: {
    appId: string;
    accountId: string;
    fromHandle: string;
    toHandle: string;
  }) => Promise<{ finalize: () => Promise<void>; rollback: () => Promise<void> }>;
};
