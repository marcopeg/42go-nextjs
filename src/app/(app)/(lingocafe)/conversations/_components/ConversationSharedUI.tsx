"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import Link from "next/link";
import { Check, ChevronRight, MessageCircle, Star } from "lucide-react";
import type { CSSProperties } from "react";

import {
  PlainList,
  PlainListItem,
} from "@/42go/components/PlainList";
import type {
  ConversationCategory,
  ConversationChoice,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ConversationBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex min-h-6 items-center rounded-full border bg-muted/30 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </span>
);

export const ConversationState = ({ isRead }: { isRead: boolean }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    {isRead ? <Check aria-hidden="true" className="size-3.5" /> : null}
    {isRead ? "Read" : "Unread"}
  </span>
);

export const ConversationError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div
    role="alert"
    className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
  >
    <span>{message}</span>
    {onRetry ? (
      <Button type="button" variant="destructiveOutline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    ) : null}
  </div>
);

export const ConversationLoading = ({ label = "Loading conversations…" }) => (
  <div
    role="status"
    aria-live="polite"
    className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm"
  >
    {label}
  </div>
);

export const ConversationEmpty = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-lg border bg-card p-5 shadow-sm">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>
);

export const CategoryList = ({
  categories,
  getHref,
  flush = false,
  flushMobileTop = false,
  bottomMargin = "30vw",
}: {
  categories: ConversationCategory[];
  getHref: (category: ConversationCategory) => string;
  flush?: boolean;
  flushMobileTop?: boolean;
  bottomMargin?: CSSProperties["marginBottom"];
}) => (
  <>
    <PlainList
      bleedMobile={!flush}
      flushMobileTop={flushMobileTop}
      className={cn(flush && "border-t-0 md:rounded-none md:border-x-0")}
    >
      {categories.map((category) => (
        <PlainListItem key={category.id}>
          <Link
            href={getHref(category)}
            className="flex min-h-16 w-full touch-manipulation items-start gap-3 px-6 py-3 text-left outline-none transition-[background-color,filter,box-shadow] duration-75 hover:brightness-[0.98] active:bg-muted active:brightness-95 focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110 dark:active:brightness-110 md:py-4"
          >
            <MessageCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{category.title}</span>
              {category.goal || category.description ? (
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                  {category.goal || category.description}
                </span>
              ) : null}
            </span>
            <span
              aria-label={`${category.availableCount} ${category.availableCount === 1 ? "conversation" : "conversations"} available`}
              className="mt-0.5 inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
            >
              {category.availableCount}
            </span>
            <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </Link>
        </PlainListItem>
      ))}
    </PlainList>
    <div
      aria-hidden="true"
      className="shrink-0 md:hidden"
      style={{ height: bottomMargin }}
    />
  </>
);

export const ConversationChoiceRow = ({
  choice,
  href,
  showContext = false,
  onStarChange,
  starPending = false,
}: {
  choice: ConversationChoice;
  href: string;
  showContext?: boolean;
  onStarChange?: (choice: ConversationChoice) => void;
  starPending?: boolean;
}) => (
  <div className="flex min-w-0 items-stretch">
    <Link
      href={href}
      aria-label={`Open ${choice.title}`}
      className="flex min-w-0 flex-1 items-center touch-manipulation outline-none transition-colors duration-75 hover:bg-muted/50 active:bg-muted focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="min-w-0 flex-1 space-y-1 px-5 py-4">
        <p className="font-medium text-foreground">{choice.title}</p>
        {choice.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {choice.description}
          </p>
        ) : null}
        {showContext && (choice.scenarioTitle || choice.variantTitle) ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            {choice.scenarioTitle ? (
              <span>{choice.scenarioTitle}</span>
            ) : null}
            {choice.scenarioTitle && choice.variantTitle ? <span aria-hidden="true">·</span> : null}
            {choice.variantTitle ? (
              <span>{choice.variantTitle}</span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ConversationBadge>{choice.cefrLevel}</ConversationBadge>
          <ConversationState isRead={choice.isRead} />
        </div>
      </div>
      <span className="my-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground">
        <ChevronRight aria-hidden="true" className="size-4" />
      </span>
    </Link>
    {onStarChange ? (
      <button
        type="button"
        aria-label={choice.isStarred ? `Unstar ${choice.title}` : `Star ${choice.title}`}
        aria-pressed={choice.isStarred}
        disabled={starPending}
        onClick={() => onStarChange(choice)}
        className="m-2 flex size-11 touch-manipulation shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-75 hover:bg-muted hover:text-foreground active:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <Star
          aria-hidden="true"
          className={cn("size-5", choice.isStarred && "fill-primary text-primary")}
        />
      </button>
    ) : null}
  </div>
);

const ConversationGroupState = ({ choices }: { choices: ConversationChoice[] }) => {
  const readCount = choices.filter((choice) => choice.isRead).length;

  if (readCount === 0) return <ConversationState isRead={false} />;
  if (readCount === choices.length) return <ConversationState isRead />;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Check aria-hidden="true" className="size-3.5" />
      {readCount}/{choices.length} read
    </span>
  );
};

export const ConversationChoiceGroupRow = ({
  choices,
  getHref,
}: {
  choices: ConversationChoice[];
  getHref: (choice: ConversationChoice) => string;
}) => {
  const firstChoice = choices[0];
  if (!firstChoice) return null;

  if (choices.length === 1) {
    return <ConversationChoiceRow choice={firstChoice} href={getHref(firstChoice)} />;
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Choose a level for ${firstChoice.title}`}
          className="flex min-w-0 w-full touch-manipulation items-center text-left outline-none transition-colors duration-75 hover:bg-muted/50 active:bg-muted focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="min-w-0 flex-1 space-y-1 px-5 py-4">
            <span className="block font-medium text-foreground">{firstChoice.title}</span>
            {firstChoice.description ? (
              <span className="line-clamp-2 block text-sm text-muted-foreground">
                {firstChoice.description}
              </span>
            ) : null}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              {choices.map((choice) => (
                <ConversationBadge key={choice.id}>{choice.cefrLevel}</ConversationBadge>
              ))}
              <ConversationGroupState choices={choices} />
            </span>
          </span>
          <span className="my-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground">
            <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={12}
          className="z-[80] w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg outline-none"
        >
          <div className="px-3 pb-2 pt-1">
            <p className="text-sm font-semibold">Choose a level</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Which version would you like to read?
            </p>
          </div>
          <div className="space-y-1">
            {choices.map((choice) => (
              <PopoverPrimitive.Close asChild key={choice.id}>
                <Link
                  href={getHref(choice)}
                  className="flex min-h-12 items-center justify-between gap-4 rounded-lg px-3 py-2 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="font-semibold uppercase">{choice.cefrLevel}</span>
                  <ConversationState isRead={choice.isRead} />
                </Link>
              </PopoverPrimitive.Close>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
