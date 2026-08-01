"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExpandableFabPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "right-start"
  | "right"
  | "right-end"
  | "bottom-start"
  | "bottom"
  | "bottom-end"
  | "left-start"
  | "left"
  | "left-end";

export type ExpandableFabAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
};

type ExpandableFabProps = {
  icon: ReactNode;
  label: string;
  actions?: readonly ExpandableFabAction[];
  onClick?: () => void;
  selectedActionId?: string;
  selectionCommitDelayMs?: number;
  placement?: ExpandableFabPlacement;
  openOnHover?: boolean;
  hoverOpenDelayMs?: number;
  hoverCloseDelayMs?: number;
  disabled?: boolean;
  className?: string;
  actionClassName?: string;
  contentStyle?: CSSProperties;
};

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

const placements: Record<
  ExpandableFabPlacement,
  { side: Side; align: Align }
> = {
  "top-start": { side: "top", align: "start" },
  top: { side: "top", align: "center" },
  "top-end": { side: "top", align: "end" },
  "right-start": { side: "right", align: "start" },
  right: { side: "right", align: "center" },
  "right-end": { side: "right", align: "end" },
  "bottom-start": { side: "bottom", align: "start" },
  bottom: { side: "bottom", align: "center" },
  "bottom-end": { side: "bottom", align: "end" },
  "left-start": { side: "left", align: "start" },
  left: { side: "left", align: "center" },
  "left-end": { side: "left", align: "end" },
};

const actionClass =
  "flex min-h-11 w-max min-w-44 touch-manipulation cursor-pointer select-none items-center gap-2 rounded-xl border border-border bg-popover px-4 py-3 text-sm font-medium text-popover-foreground shadow-lg outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const transparentContentChromeReset: CSSProperties = {
  border: 0,
  outline: "none",
  boxShadow: "none",
  WebkitTapHighlightColor: "transparent",
};

export const ExpandableFab = ({
  icon,
  label,
  actions,
  onClick,
  selectedActionId,
  selectionCommitDelayMs = 300,
  placement = "top",
  openOnHover = false,
  hoverOpenDelayMs = 300,
  hoverCloseDelayMs = 180,
  disabled,
  className,
  actionClassName,
  contentStyle,
}: ExpandableFabProps) => {
  const [open, setOpen] = useState(false);
  const [optimisticSelectedActionId, setOptimisticSelectedActionId] =
    useState<string>();
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(
    () => () => {
      if (hoverOpenTimerRef.current) {
        clearTimeout(hoverOpenTimerRef.current);
      }
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
      }
      if (selectionCommitTimerRef.current) {
        clearTimeout(selectionCommitTimerRef.current);
      }
    },
    []
  );

  const cancelHoverOpen = () => {
    if (!hoverOpenTimerRef.current) return;
    clearTimeout(hoverOpenTimerRef.current);
    hoverOpenTimerRef.current = null;
  };
  const cancelHoverClose = () => {
    if (!hoverCloseTimerRef.current) return;
    clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
  };
  const handleHoverEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType !== "mouse") return;
    cancelHoverClose();
    if (open || hoverOpenTimerRef.current) return;
    hoverOpenTimerRef.current = setTimeout(() => {
      hoverOpenTimerRef.current = null;
      setOpen(true);
    }, hoverOpenDelayMs);
  };
  const handleHoverLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType !== "mouse") return;
    cancelHoverOpen();
    cancelHoverClose();
    if (!open) return;
    hoverCloseTimerRef.current = setTimeout(
      () => setOpen(false),
      hoverCloseDelayMs
    );
  };
  const handleSelectableAction = (
    event: Event,
    action: ExpandableFabAction
  ) => {
    event.preventDefault();
    setOptimisticSelectedActionId(action.id);
    if (selectionCommitTimerRef.current) {
      clearTimeout(selectionCommitTimerRef.current);
    }
    selectionCommitTimerRef.current = setTimeout(() => {
      selectionCommitTimerRef.current = null;
      try {
        action.onSelect();
      } finally {
        setOptimisticSelectedActionId(undefined);
        setOpen(false);
      }
    }, selectionCommitDelayMs);
  };
  const handleOpenChange = (next: boolean) => {
    cancelHoverOpen();
    setOpen(next);
  };
  const trigger = (
    <Button
      type="button"
      size="fab"
      disabled={disabled}
      onClick={actions ? undefined : onClick}
      aria-label={label}
      title={label}
      className={cn("shadow-xl", className)}
    >
      {icon}
    </Button>
  );

  if (!actions) return trigger;

  const { side, align } = placements[placement];
  const renderContent = (action: ExpandableFabAction) => (
    <>
      <span className="flex size-4 items-center justify-center text-primary">
        {action.id === (optimisticSelectedActionId ?? selectedActionId) ? (
          <Check aria-hidden="true" className="size-4" />
        ) : null}
      </span>
      {action.icon}
      <span>{action.label}</span>
    </>
  );

  return (
    <DropdownMenuPrimitive.Root
      modal={false}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <span
        className="inline-flex"
        onPointerEnter={handleHoverEnter}
        onPointerLeave={handleHoverLeave}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          {trigger}
        </DropdownMenuPrimitive.Trigger>
      </span>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side={side}
          align={align}
          sideOffset={10}
          collisionPadding={12}
          loop
          aria-label={`${label} actions`}
          style={{
            ...contentStyle,
            ...transparentContentChromeReset,
          }}
          onPointerEnter={handleHoverEnter}
          onPointerLeave={handleHoverLeave}
          className="z-[1100] flex flex-col gap-2 overflow-visible bg-transparent p-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150 motion-reduce:animate-none"
        >
          {selectedActionId === undefined ? (
            actions.map((action) => (
              <DropdownMenuPrimitive.Item
                key={action.id}
                disabled={action.disabled}
                onSelect={action.onSelect}
                className={cn(actionClass, actionClassName)}
              >
                {renderContent(action)}
              </DropdownMenuPrimitive.Item>
            ))
          ) : (
            <DropdownMenuPrimitive.RadioGroup
              value={optimisticSelectedActionId ?? selectedActionId}
              className="flex flex-col gap-2"
            >
              {actions.map((action) => (
                <DropdownMenuPrimitive.RadioItem
                  key={action.id}
                  value={action.id}
                  disabled={action.disabled}
                  onSelect={(event) => handleSelectableAction(event, action)}
                  className={cn(actionClass, actionClassName)}
                >
                  {renderContent(action)}
                </DropdownMenuPrimitive.RadioItem>
              ))}
            </DropdownMenuPrimitive.RadioGroup>
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
};
