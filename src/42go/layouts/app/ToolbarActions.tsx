import { type TActionItem } from "./types";
import { ContentBlock } from "@/42go/components/ContentBlock/client";

interface ToolbarActionsProps {
  actions?: TActionItem[];
}

export function ToolbarActions({ actions }: ToolbarActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-4">
      <ContentBlock items={actions} />
    </div>
  );
}
