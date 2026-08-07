import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PlainListProps = ComponentPropsWithoutRef<"div"> & {
  flushMobileTop?: boolean;
  bleedMobile?: boolean;
};

export const PlainList = ({
  className,
  flushMobileTop = false,
  bleedMobile = true,
  ...props
}: PlainListProps) => (
  <div
    className={cn(
      "divide-y border-y bg-card md:mx-0 md:overflow-hidden md:rounded-lg md:border",
      bleedMobile ? "-mx-6" : "mx-0",
      flushMobileTop && "border-t-0 md:border-t",
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
