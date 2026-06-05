import {
  blocksMap,
  type ContentBlockItem,
} from "@/42go/components/ContentBlock/server";
import { createRenderer } from "@/42go/components/ContentBlock/render-component";
import { type TActionItem } from "./types";

interface ToolbarActionsProps {
  actions?: TActionItem[];
}

const renderToolbarAction = createRenderer(blocksMap);

export function ToolbarActions({ actions }: ToolbarActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {(actions as ContentBlockItem[]).map(renderToolbarAction)}
    </div>
  );
}
