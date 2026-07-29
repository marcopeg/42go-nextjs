import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PlainListProps = ComponentPropsWithoutRef<"div"> & {
  flushMobileTop?: boolean;
};

export const PlainList = ({
  className,
  flushMobileTop = false,
  ...props
}: PlainListProps) => (
  <div
    className={cn(
      "-mx-6 divide-y border-y bg-card md:mx-0 md:overflow-hidden md:rounded-lg md:border",
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
      "flex w-full items-start gap-3 px-6 py-3 text-left outline-none transition-[filter,box-shadow] hover:brightness-[0.98] focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110 md:px-5 md:py-4",
      className
    )}
    {...props}
  />
);
