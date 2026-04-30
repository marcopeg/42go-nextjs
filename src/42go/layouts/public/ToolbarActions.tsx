import { ContentBlock } from "@/42go/components/ContentBlock/server";
import { type TActionItem } from "./types";

interface ToolbarActionsProps {
  actions?: TActionItem[];
}

export function ToolbarActions({ actions }: ToolbarActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <ContentBlock items={actions} />
    </div>
  );
}
