"use client";
import type { ReactNode } from "react";
import { Panel, type PanelProps } from "./Panel";
import { PanelHeader } from "./PanelHeader";
import { PanelTitle } from "./PanelTitle";
import { PanelDescription } from "./PanelDescription";
import { PanelBody } from "./PanelBody";
import { ProtectComponent } from "@/42go/policy/client";
import type { Policy } from "@/42go/policy/types";

/**
 * SimplePanel
 * Quick usage sugar around Panel primitives.
 *
 * Example:
 * <SimplePanel title="Security" actions={<Button>Enable</Button>}>
 *   <p>Content...</p>
 * </SimplePanel>
 */
export interface SimplePanelProps extends Omit<PanelProps, "children"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  policy?: Policy | Policy[];
  renderOnLoading?: () => ReactNode;
  renderOnError?: (args: { code: string; detail?: string }) => ReactNode;
}

export const SimplePanel = ({
  title,
  description,
  actions,
  children,
  headerClassName,
  bodyClassName,
  policy,
  renderOnLoading,
  renderOnError,
  ...panelProps
}: SimplePanelProps) => {
  const inner = (
    <Panel {...panelProps}>
      {(title || description || actions) && (
        <PanelHeader actions={actions} className={headerClassName}>
          {title && <PanelTitle>{title}</PanelTitle>}
          {description && <PanelDescription>{description}</PanelDescription>}
        </PanelHeader>
      )}
      <PanelBody className={bodyClassName}>{children}</PanelBody>
    </Panel>
  );

  if (!policy) return inner;

  return (
    <ProtectComponent
      policy={policy}
      renderOnLoading={renderOnLoading}
      renderOnError={renderOnError || (() => null)}
    >
      {inner}
    </ProtectComponent>
  );
};
