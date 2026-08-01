"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import {
  type CSSProperties,
  type ComponentProps,
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

type ExpandableFabSide = "top" | "right" | "bottom" | "left";
type ExpandableFabAlign = "start" | "center" | "end";

type ExpandableFabBaseProps = {
  icon: ReactNode;
  label: string;
  title?: string;
  className?: string;
  disabled?: boolean;
};

type ExpandableFabDirectProps = ExpandableFabBaseProps & {
  actions?: never;
  onClick: NonNullable<ComponentProps<typeof Button>["onClick"]>;
};

type ExpandableFabMenuProps = ExpandableFabBaseProps & {
  actions: readonly ExpandableFabAction[];
  onClick?: never;
  selectedActionId?: string;
  selectionCommitDelayMs?: number;
  placement?: ExpandableFabPlacement;
  sideOffset?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openOnHover?: boolean;
  hoverOpenDelayMs?: number;
  hoverCloseDelayMs?: number;
  contentClassName?: string;
  actionClassName?: string;
  contentStyle?: CSSProperties;
};

export type ExpandableFabProps =
  | ExpandableFabDirectProps
  | ExpandableFabMenuProps;

const placementConfig: Record<
  ExpandableFabPlacement,
  {
    side: ExpandableFabSide;
    align: ExpandableFabAlign;
  }
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

const actionBaseClassName =
  "flex min-h-11 w-max min-w-44 touch-manipulation cursor-pointer select-none items-center gap-2 rounded-xl border border-border bg-popover px-4 py-3 text-sm font-medium text-popover-foreground shadow-lg outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const transparentContentChromeReset: CSSProperties = {
  border: 0,
  outline: "none",
  boxShadow: "none",
  WebkitTapHighlightColor: "transparent",
};

export const ExpandableFab = (props: ExpandableFabProps) => {
  const isMenu = "actions" in props && Boolean(props.actions);
  const initiallyOpen =
    "defaultOpen" in props ? Boolean(props.defaultOpen) : false;
  const [internalOpen, setInternalOpen] = useState(
    isMenu && initiallyOpen
  );
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

  const trigger = (
    <Button
      type="button"
      size="fab"
      disabled={props.disabled}
      aria-label={props.label}
      title={props.title ?? props.label}
      className={cn("shadow-xl", props.className)}
      {...("actions" in props ? {} : { onClick: props.onClick })}
    >
      {props.icon}
    </Button>
  );

  if (!("actions" in props) || !props.actions) {
    return trigger;
  }

  const {
    actions,
    selectedActionId,
    placement = "top",
    sideOffset = 10,
    open,
    onOpenChange,
    openOnHover = false,
    hoverOpenDelayMs = 300,
    hoverCloseDelayMs = 180,
    selectionCommitDelayMs = 300,
    contentClassName,
    actionClassName,
    contentStyle,
  } = props;
  const { side, align } = placementConfig[placement];
  const hasSelection = selectedActionId !== undefined;
  const resolvedSelectedActionId = hasSelection
    ? optimisticSelectedActionId ?? selectedActionId
    : undefined;
  const resolvedOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    cancelHoverOpen();
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const handleHoverEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType !== "mouse") return;
    cancelHoverClose();
    if (resolvedOpen || hoverOpenTimerRef.current) return;
    hoverOpenTimerRef.current = setTimeout(() => {
      hoverOpenTimerRef.current = null;
      setOpen(true);
    }, hoverOpenDelayMs);
  };
  const handleHoverLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType !== "mouse") return;
    cancelHoverOpen();
    cancelHoverClose();
    if (!resolvedOpen) return;
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
  const renderActionContents = (
    action: ExpandableFabAction,
    selected: boolean
  ) => (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center text-primary">
        {selected ? <Check aria-hidden="true" className="size-4" /> : null}
      </span>
      {action.icon}
      <span>{action.label}</span>
    </>
  );

  return (
    <DropdownMenuPrimitive.Root
      modal={false}
      open={resolvedOpen}
      onOpenChange={setOpen}
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
          sideOffset={sideOffset}
          collisionPadding={12}
          loop
          aria-label={`${props.label} actions`}
          style={{
            ...contentStyle,
            ...transparentContentChromeReset,
          }}
          onPointerEnter={handleHoverEnter}
          onPointerLeave={handleHoverLeave}
          className={cn(
            "z-[1100] flex min-w-0 flex-col gap-2 overflow-visible bg-transparent p-0 text-foreground shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150 motion-reduce:animate-none",
            contentClassName
          )}
        >
          {hasSelection ? (
            <DropdownMenuPrimitive.RadioGroup
              value={resolvedSelectedActionId}
              className="flex flex-col gap-2"
            >
              {actions.map((action) => (
                <DropdownMenuPrimitive.RadioItem
                  key={action.id}
                  value={action.id}
                  disabled={action.disabled}
                  onSelect={(event) => handleSelectableAction(event, action)}
                  className={cn(
                    actionBaseClassName,
                    actionClassName
                  )}
                >
                  {renderActionContents(
                    action,
                    action.id === resolvedSelectedActionId
                  )}
                </DropdownMenuPrimitive.RadioItem>
              ))}
            </DropdownMenuPrimitive.RadioGroup>
          ) : (
            actions.map((action) => (
              <DropdownMenuPrimitive.Item
                key={action.id}
                disabled={action.disabled}
                onSelect={action.onSelect}
                className={cn(
                  actionBaseClassName,
                  actionClassName
                )}
              >
                {renderActionContents(action, false)}
              </DropdownMenuPrimitive.Item>
            ))
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
};
