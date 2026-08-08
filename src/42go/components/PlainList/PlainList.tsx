import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PlainListProps = ComponentPropsWithoutRef<"div"> & {
  flushMobileTop?: boolean;
  bleedMobile?: boolean;
  hideMobileTopBorder?: boolean;
  hideMobileBottomBorder?: boolean;
  desktopVariant?: "default" | "contained" | "flush";
};

export const PlainList = ({
  className,
  flushMobileTop = false,
  bleedMobile = true,
  hideMobileTopBorder = false,
  hideMobileBottomBorder = false,
  desktopVariant = "default",
  ...props
}: PlainListProps) => (
  <div
    className={cn(
      "divide-y bg-card md:mx-0",
      flushMobileTop || hideMobileTopBorder ? "border-t-0" : "border-t",
      hideMobileBottomBorder ? "border-b-0" : "border-b",
      bleedMobile ? "-mx-6" : "mx-0",
      desktopVariant === "default" &&
        "md:overflow-hidden md:rounded-lg md:border",
      desktopVariant === "contained" &&
        "md:my-6 md:overflow-hidden md:rounded-xl md:border md:shadow-sm",
      desktopVariant === "flush" &&
        "md:my-0 md:rounded-none md:border-x-0 md:shadow-none",
      className
    )}
    {...props}
  />
);

export const PlainListItem = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div className={cn("min-w-0", className)} {...props} />
);

export const PlainListButton = ({
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button">) => (
  <button
    type={type}
    className={cn(
      "flex w-full touch-manipulation items-start gap-3 px-6 py-3 text-left outline-none transition-[background-color,filter,box-shadow] duration-75 hover:brightness-[0.98] active:bg-muted active:brightness-95 focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110 dark:active:brightness-110 md:px-5 md:py-4",
      className
    )}
    {...props}
  />
);
