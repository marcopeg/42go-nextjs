"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import * as RadixPopover from "@radix-ui/react-popover";

export interface SplitAcceptRejectProps {
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function SplitAcceptReject({
  busy,
  onAccept,
  onReject,
}: SplitAcceptRejectProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative flex rounded border border-green-600 overflow-hidden">
      <button
        type="button"
        className="btn btn-outline rounded-none flex items-center text-green-600 hover:bg-green-600/10 px-2 py-1 text-xs border-none"
        onClick={onAccept}
        disabled={busy}
      >
        {busy ? "Joining…" : "Accept"}
      </button>
      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            className="btn btn-outline rounded-none px-2 border-l border-green-600 flex items-center text-green-600 border-none"
            aria-label="More actions"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </RadixPopover.Trigger>
        <RadixPopover.Content
          sideOffset={4}
          align="end"
          className="bg-popover border rounded shadow-lg p-0 w-40 z-50"
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-600/10 border-b border-gray-100 last:border-b-0"
            onClick={() => {
              onReject();
              setOpen(false);
            }}
          >
            Reject invite
          </button>
        </RadixPopover.Content>
      </RadixPopover.Root>
    </div>
  );
}