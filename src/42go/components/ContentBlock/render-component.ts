import React from "react";
import { UnknownBlock } from "./UnknownBlock";

type ContentBlockMarginBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";
type ContentBlockSpacingUnit = string;
type ContentBlockResponsiveSpacing =
  | ContentBlockSpacingUnit
  | Partial<Record<ContentBlockMarginBreakpoint, ContentBlockSpacingUnit>>;

export type TContentBlockMargin = {
  top?: ContentBlockResponsiveSpacing;
  bottom?: ContentBlockResponsiveSpacing;
};

export type TContentBlockPadding = {
  top?: ContentBlockResponsiveSpacing;
  bottom?: ContentBlockResponsiveSpacing;
};

export type WithContentBlockMargin<T extends { type: string }> = T & {
  margin?: TContentBlockMargin;
};

export type WithContentBlockPadding<T extends { type: string }> = T & {
  padding?: TContentBlockPadding;
};

const marginClassNames = {
  top: {
    base: "mt-[var(--content-block-mt)]",
    sm: "sm:mt-[var(--content-block-sm-mt)]",
    md: "md:mt-[var(--content-block-md-mt)]",
    lg: "lg:mt-[var(--content-block-lg-mt)]",
    xl: "xl:mt-[var(--content-block-xl-mt)]",
    "2xl": "2xl:mt-[var(--content-block-2xl-mt)]",
  },
  bottom: {
    base: "mb-[var(--content-block-mb)]",
    sm: "sm:mb-[var(--content-block-sm-mb)]",
    md: "md:mb-[var(--content-block-md-mb)]",
    lg: "lg:mb-[var(--content-block-lg-mb)]",
    xl: "xl:mb-[var(--content-block-xl-mb)]",
    "2xl": "2xl:mb-[var(--content-block-2xl-mb)]",
  },
} as const;

const paddingClassNames = {
  top: {
    base: "pt-[var(--content-block-pt)]",
    sm: "sm:pt-[var(--content-block-sm-pt)]",
    md: "md:pt-[var(--content-block-md-pt)]",
    lg: "lg:pt-[var(--content-block-lg-pt)]",
    xl: "xl:pt-[var(--content-block-xl-pt)]",
    "2xl": "2xl:pt-[var(--content-block-2xl-pt)]",
  },
  bottom: {
    base: "pb-[var(--content-block-pb)]",
    sm: "sm:pb-[var(--content-block-sm-pb)]",
    md: "md:pb-[var(--content-block-md-pb)]",
    lg: "lg:pb-[var(--content-block-lg-pb)]",
    xl: "xl:pb-[var(--content-block-xl-pb)]",
    "2xl": "2xl:pb-[var(--content-block-2xl-pb)]",
  },
} as const;

const breakpoints: ContentBlockMarginBreakpoint[] = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
];

const resolveSpacingValue = (unit: ContentBlockSpacingUnit) => {
  const value = unit.trim();
  if (!value) return null;
  if (value === "auto") return "auto";
  if (value === "px") return "1px";
  if (value === "0") return "0px";
  if (/^\d+(\.\d+)?$/.test(value)) {
    return `calc(var(--spacing) * ${value})`;
  }
  if (/^\[[a-zA-Z0-9\s.,/%#()+*-]+\]$/.test(value)) {
    return value.slice(1, -1).trim();
  }
  return null;
};

const entriesForSpacing = (
  value: ContentBlockResponsiveSpacing | undefined
): Array<[ContentBlockMarginBreakpoint, string]> => {
  if (!value) return [];
  if (typeof value === "string") {
    const resolved = resolveSpacingValue(value);
    return resolved ? [["base", resolved]] : [];
  }

  return breakpoints.flatMap((breakpoint) => {
    const unit = value[breakpoint];
    if (!unit) return [];
    const resolved = resolveSpacingValue(unit);
    return resolved ? ([[breakpoint, resolved]] as Array<[ContentBlockMarginBreakpoint, string]>) : [];
  });
};

const resolveMarginProps = (margin: TContentBlockMargin | undefined) => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};

  for (const [breakpoint, value] of entriesForSpacing(margin?.top)) {
    classNames.push(marginClassNames.top[breakpoint]);
    const suffix = breakpoint === "base" ? "" : `${breakpoint}-`;
    style[`--content-block-${suffix}mt`] = value;
  }

  for (const [breakpoint, value] of entriesForSpacing(margin?.bottom)) {
    classNames.push(marginClassNames.bottom[breakpoint]);
    const suffix = breakpoint === "base" ? "" : `${breakpoint}-`;
    style[`--content-block-${suffix}mb`] = value;
  }

  if (classNames.length === 0) return null;
  return {
    className: classNames.join(" "),
    style: style as React.CSSProperties,
  };
};

export const resolveContentBlockPaddingProps = (
  padding: TContentBlockPadding | undefined
) => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};

  for (const [breakpoint, value] of entriesForSpacing(padding?.top)) {
    classNames.push(paddingClassNames.top[breakpoint]);
    const suffix = breakpoint === "base" ? "" : `${breakpoint}-`;
    style[`--content-block-${suffix}pt`] = value;
  }

  for (const [breakpoint, value] of entriesForSpacing(padding?.bottom)) {
    classNames.push(paddingClassNames.bottom[breakpoint]);
    const suffix = breakpoint === "base" ? "" : `${breakpoint}-`;
    style[`--content-block-${suffix}pb`] = value;
  }

  if (classNames.length === 0) return null;
  return {
    className: classNames.join(" "),
    style: style as React.CSSProperties,
  };
};

/**
 * Type definition for blocks map
 */
export type BlocksMap = Record<string, React.ComponentType<{ data: unknown }>>;

type RendererOptions = {
  defaultMargin?: TContentBlockMargin;
};

const mergeMargin = (
  margin: TContentBlockMargin | undefined,
  defaultMargin: TContentBlockMargin | undefined
) => {
  if (!defaultMargin) return margin;

  return {
    top: margin?.top ?? defaultMargin.top,
    bottom: margin?.bottom ?? defaultMargin.bottom,
  };
};

/**
 * Factory function that creates a renderer with a specific blocks map
 */
export function createRenderer<T extends { type: string }>(
  blocks: BlocksMap,
  options: RendererOptions = {}
) {
  return function renderComponent(component: T, index: number) {
    const BlockComponent = blocks[component.type];
    const marginProps = resolveMarginProps(
      mergeMargin(
        (component as T & { margin?: TContentBlockMargin }).margin,
        options.defaultMargin
      )
    );

    if (BlockComponent) {
      const element = React.createElement(BlockComponent, {
        data: component,
      });

      if (!marginProps) {
        return React.cloneElement(element, { key: index });
      }

      return React.createElement(
        "div",
        {
          key: index,
          ...marginProps,
        },
        element
      );
    }

    return React.createElement(UnknownBlock, {
      key: index,
      component: component as { type: string; [key: string]: unknown },
    });
  };
}
