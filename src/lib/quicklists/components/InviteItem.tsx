"use client";

import { DisplayDate } from "@/42go/components/DisplayDate";
import { SplitAcceptReject } from "./SplitAcceptReject";
import { Invite } from "../hooks/useQuicklistsData";

export interface InviteItemProps {
  invite: Invite;
  busy: boolean;
  onAccept: (projectId: string) => void;
  onReject: (projectId: string, email: string) => void;
}

export function InviteItem({
  invite,
  busy,
  onAccept,
  onReject,
}: InviteItemProps) {
  return (
    <li
      key={invite.project_id + invite.email}
      className="p-3 flex items-center justify-between hover:bg-muted/20"
    >
      <div className="space-y-1">
        <div className="font-medium">
          {invite.title}
          <span className="ml-2 text-xs rounded px-2 py-0.5 bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border border-yellow-600/30">
            invite
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <DisplayDate date={invite.created_at} />
          <span className="text-muted-foreground">|</span>
          <span>invited by:</span>
          <span className="relative group font-medium text-muted-foreground cursor-pointer">
            {invite.owner_username}
            <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-10 hidden group-hover:block bg-popover text-xs text-muted-foreground px-2 py-1 rounded shadow-lg border">
              {invite.owner_email}
            </span>
          </span>
        </div>
      </div>
      <SplitAcceptReject
        busy={busy}
        onAccept={() => onAccept(invite.project_id)}
        onReject={() => onReject(invite.project_id, invite.email)}
      />
    </li>
  );
}