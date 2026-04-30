import React from "react";
import type { ContentBlockItem as ServerContentBlockItem } from "../server";

// Responsive helper type
// Plain string overrides all breakpoints. Object allows per-breakpoint overrides.
// Breakpoints mirror Tailwind's sm/md/lg/xl (base = mobile-first default)
// This matches the refined spec in task ael.

type ResponsiveValue<T extends string> =
  | T
  | {
      base?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };

// New richer per-cell configuration while preserving legacy direct block array support.
export interface TStackCell {
  items: ServerContentBlockItem[]; // blocks inside this cell
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch"; // maps to self-*
  grow?: boolean; // flex-grow
  shrink?: boolean; // default true; false => flex-shrink-0
  basis?: string; // tailwind basis token or raw css value
  width?: string; // tailwind w-* token convenience
  className?: string; // escape hatch
}

export type TStackItem = ServerContentBlockItem | TStackCell;

export interface TStackBlock {
  type: "stack";
  direction?: ResponsiveValue<"row" | "column">; // default 'row'
  spacing?: ResponsiveValue<"none" | "sm" | "md" | "lg" | "xl">; // default 'none'
  wrap?: boolean;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  items: TStackItem[]; // mixed legacy blocks or rich cells
}

const spacingMap: Record<string, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const directionMap: Record<string, string> = {
  row: "flex-row",
  column: "flex-col",
};

const alignMap: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyMap: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const breakpoints: Array<keyof Exclude<ResponsiveValue<string>, string>> = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
];

const expandResponsive = (
  value: ResponsiveValue<string> | undefined,
  map: Record<string, string>,
  prefix: (mapped: string) => string = (m) => m
) => {
  if (!value) return [] as string[];
  if (typeof value === "string") return [prefix(map[value] ?? "")];
  const classes: string[] = [];
  for (const bp of breakpoints) {
    const v = value[bp];
    if (!v) continue;
    const mapped = map[v];
    if (!mapped) continue;
    if (bp === "base") classes.push(prefix(mapped));
    else classes.push(`${bp}:${prefix(mapped)}`);
  }
  return classes;
};

export const StackBlock = ({
  data,
  renderItem,
}: {
  data: TStackBlock;
  renderItem: (item: ServerContentBlockItem, index: number) => React.ReactNode;
}) => {
  const {
    direction = "row",
    spacing = "none",
    wrap,
    align,
    justify,
    items,
  } = data;

  if (!items || items.length === 0) return null;

  const classNames: string[] = ["flex"];
  classNames.push(
    ...expandResponsive(direction, directionMap),
    ...expandResponsive(spacing, spacingMap)
  );
  if (wrap) classNames.push("flex-wrap");
  if (align) classNames.push(alignMap[align] ?? "");
  if (justify) classNames.push(justifyMap[justify] ?? "");

  const cellAlignSelfMap: Record<string, string> = {
    auto: "self-auto",
    start: "self-start",
    center: "self-center",
    end: "self-end",
    stretch: "self-stretch",
  };

  const renderStackItem = (item: TStackItem, index: number) => {
    // Legacy single block
    if ((item as ServerContentBlockItem)?.type) {
      return (
        <div key={index}>
          {renderItem(item as ServerContentBlockItem, index)}
        </div>
      );
    }
    const cell = item as TStackCell;
    if (!cell.items || cell.items.length === 0) return null;
    const cellClasses: string[] = [];
    if (cell.alignSelf)
      cellClasses.push(cellAlignSelfMap[cell.alignSelf] || "");
    if (cell.grow) cellClasses.push("flex-grow");
    if (cell.shrink === false) cellClasses.push("flex-shrink-0");
    if (cell.basis) {
      if (cell.basis.startsWith("basis-")) cellClasses.push(cell.basis);
      else cellClasses.push(`basis-${cell.basis}`);
    }
    if (cell.width) {
      if (cell.width.startsWith("w-")) cellClasses.push(cell.width);
      else cellClasses.push(`w-${cell.width}`);
    }
    if (cell.className) cellClasses.push(cell.className);
    return (
      <div key={index} className={cellClasses.filter(Boolean).join(" ")}>
        {cell.items.map(renderItem)}
      </div>
    );
  };

  return (
    <div role="group" className={classNames.filter(Boolean).join(" ")}>
      {items.map(renderStackItem)}
    </div>
  );
};
