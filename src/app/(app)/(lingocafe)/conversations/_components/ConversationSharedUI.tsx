"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, MessageCircle, Star } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  PlainList,
  PlainListItem,
} from "@/42go/components/PlainList";
import {
  SwipeableBottomSheet,
  type SwipeableBottomSheetHandle,
} from "@/42go/components/SwipeableBottomSheet";
import { PersonaAvatar } from "@/app/(app)/(lingocafe)/_components/PersonaAvatar";
import type {
  ConversationCategory,
  ConversationChoice,
  ConversationParticipant,
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

const ConversationParticipantAvatars = ({
  participants = [],
}: {
  participants?: ConversationParticipant[];
}) => {
  if (participants.length === 0) return null;

  return (
    <span
      role="group"
      aria-label="Conversation participants"
      className="pointer-events-auto relative z-20 ml-auto flex shrink-0 -space-x-2 pl-2"
      onClick={(event) => event.stopPropagation()}
    >
      {participants.slice(0, 2).map((participant) => (
        <PersonaAvatar
          key={participant.id}
          displayName={participant.displayName}
          avatarUrl={participant.avatarUrl}
          avatarFallbackUrl={participant.avatarFallbackUrl}
          nameAlign="right"
          size="sm"
          className="rounded-full ring-2 ring-background"
        />
      ))}
    </span>
  );
};

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

export const ConversationListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <PlainList
    role="status"
    aria-label="Loading category"
    bleedMobile={false}
    hideMobileTopBorder
    hideMobileBottomBorder
    desktopVariant="contained"
    className="bg-background"
  >
    {Array.from({ length: rows }, (_, index) => (
      <div className="flex min-h-28 items-start gap-3 px-6 py-4" key={index}>
        <div className="mt-0.5 size-5 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-5 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted/80 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted/80 motion-reduce:animate-none" />
          </div>
        </div>
        <div className="mt-1 h-5 w-8 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      </div>
    ))}
    <span className="sr-only">Loading…</span>
  </PlainList>
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
  onNavigate,
  leadingItems,
  trailingItems,
}: {
  categories: ConversationCategory[];
  getHref: (category: ConversationCategory) => string;
  onNavigate?: (category: ConversationCategory, href: string) => void;
  leadingItems?: ReactNode;
  trailingItems?: ReactNode;
}) => (
    <PlainList
      bleedMobile={false}
      hideMobileTopBorder
      hideMobileBottomBorder
      desktopVariant="contained"
    >
      {leadingItems}
      {categories.map((category) => {
        const href = getHref(category);
        return (
          <PlainListItem key={category.id}>
            <Link
              href={href}
              onClick={(event) => {
                if (
                  !onNavigate ||
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) return;
                event.preventDefault();
                onNavigate(category, href);
              }}
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
        );
      })}
      {trailingItems}
    </PlainList>
);

export const StarredConversationCategoryRow = ({
  count,
  href,
  onNavigate,
}: {
  count: number;
  href: string;
  onNavigate?: (href: string) => void;
}) => (
    <PlainListItem>
      <Link
        href={href}
        onClick={(event) => {
          if (
            !onNavigate ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) return;
          event.preventDefault();
          onNavigate(href);
        }}
        className="flex min-h-16 w-full touch-manipulation items-start gap-3 px-6 py-3 text-left outline-none transition-[background-color,filter,box-shadow] duration-75 hover:brightness-[0.98] active:bg-muted active:brightness-95 focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110 dark:active:brightness-110 md:py-4"
      >
        <Star aria-hidden="true" className="mt-0.5 size-5 shrink-0 fill-primary text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">Starred</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
            Your saved conversations across every level.
          </span>
        </span>
        <span
          aria-label={`${count} starred ${count === 1 ? "conversation" : "conversations"}`}
          className="mt-0.5 inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
        >
          {count}
        </span>
        <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </Link>
    </PlainListItem>
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
  <div className="relative flex min-w-0 items-stretch">
    <Link
      href={href}
      aria-label={`Open ${choice.title}`}
      className={cn(
        "absolute inset-y-0 left-0 z-0 touch-manipulation outline-none transition-colors duration-75 hover:bg-muted/50 active:bg-muted focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        onStarChange ? "right-[3.75rem]" : "right-0"
      )}
    />
    <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center">
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
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ConversationBadge>{choice.cefrLevel}</ConversationBadge>
            <ConversationState isRead={choice.isRead} />
          </div>
          <ConversationParticipantAvatars participants={choice.participants} />
        </div>
      </div>
      <span className="my-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground">
        <ChevronRight aria-hidden="true" className="size-4" />
      </span>
    </div>
    {onStarChange ? (
      <button
        type="button"
        aria-label={choice.isStarred ? `Unstar ${choice.title}` : `Star ${choice.title}`}
        aria-pressed={choice.isStarred}
        disabled={starPending}
        onClick={() => onStarChange(choice)}
        className="relative z-20 m-2 flex size-11 touch-manipulation shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-75 hover:bg-muted hover:text-foreground active:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
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
  const router = useRouter();
  const levelPickerId = useId();
  const rowButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileSheetRef = useRef<SwipeableBottomSheetHandle | null>(null);
  const mobileNavigationHrefRef = useRef<string | null>(null);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const isDesktop = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );
  if (!firstChoice) return null;

  if (choices.length === 1) {
    return <ConversationChoiceRow choice={firstChoice} href={getHref(firstChoice)} />;
  }

  const openLevelPicker = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    mobileNavigationHrefRef.current = null;
    setAnchorPoint({
      x: event.clientX || bounds.left + bounds.width / 2,
      y: event.clientY || bounds.top + bounds.height / 2,
    });
    setLevelPickerOpen(true);
  };

  const renderLevelOption = (choice: ConversationChoice) => (
    <Link
      href={getHref(choice)}
      aria-label={`Read ${firstChoice.title} at level ${choice.cefrLevel.toUpperCase()}`}
      className="flex min-h-14 items-center justify-between gap-4 rounded-xl px-4 py-3 outline-none transition-colors hover:bg-muted active:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="text-base font-semibold uppercase">{choice.cefrLevel}</span>
      <span className="flex items-center gap-2">
        <ConversationState isRead={choice.isRead} />
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
    </Link>
  );

  return (
    <>
      <div
        onClick={openLevelPicker}
        className="relative flex min-w-0 w-full items-center text-left transition-colors duration-75 hover:bg-muted/50 active:bg-muted"
      >
        <button
          ref={rowButtonRef}
          type="button"
          aria-label={`Choose a level for ${firstChoice.title}`}
          aria-haspopup="dialog"
          aria-expanded={levelPickerOpen}
          aria-controls={levelPickerOpen ? levelPickerId : undefined}
          className="absolute inset-0 z-0 touch-manipulation outline-none focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
        />
        <span className="pointer-events-none relative z-[1] min-w-0 flex-1 space-y-1 px-5 py-4">
          <span className="block font-medium text-foreground">{firstChoice.title}</span>
          {firstChoice.description ? (
            <span className="line-clamp-2 block text-sm text-muted-foreground">
              {firstChoice.description}
            </span>
          ) : null}
          <span className="relative z-20 mt-2 flex min-w-0 items-center gap-2">
            <span className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2">
              {choices.map((choice) => (
                <Link
                  key={choice.id}
                  href={getHref(choice)}
                  aria-label={`Read ${firstChoice.title} at level ${choice.cefrLevel.toUpperCase()}`}
                  onClick={(event) => event.stopPropagation()}
                  className="-my-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <ConversationBadge>{choice.cefrLevel}</ConversationBadge>
                </Link>
              ))}
              <ConversationGroupState choices={choices} />
            </span>
            <ConversationParticipantAvatars participants={firstChoice.participants} />
          </span>
        </span>
        <span className="pointer-events-none relative z-[1] my-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground">
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      </div>

      <PopoverPrimitive.Root
        open={isDesktop && levelPickerOpen}
        onOpenChange={setLevelPickerOpen}
      >
        <PopoverPrimitive.Anchor asChild>
          <span
            aria-hidden="true"
            className="pointer-events-none fixed z-[-1] size-px"
            style={{ left: anchorPoint.x, top: anchorPoint.y }}
          />
        </PopoverPrimitive.Anchor>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            id={levelPickerId}
            role="dialog"
            aria-label={`Choose a level for ${firstChoice.title}`}
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              rowButtonRef.current?.focus();
            }}
            className="z-[80] w-80 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <div className="px-3 pb-2 pt-1">
              <p className="text-sm font-semibold">Choose reading level</p>
            </div>
            <div className="space-y-1">
              {choices.map((choice) => (
                <PopoverPrimitive.Close asChild key={choice.id}>
                  {renderLevelOption(choice)}
                </PopoverPrimitive.Close>
              ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <SwipeableBottomSheet
        ref={mobileSheetRef}
        id={levelPickerId}
        open={!isDesktop && levelPickerOpen}
        onOpenChange={setLevelPickerOpen}
        title="Choose reading level"
        onCloseComplete={() => {
          const href = mobileNavigationHrefRef.current;
          mobileNavigationHrefRef.current = null;
          if (href) router.push(href);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          rowButtonRef.current?.focus();
        }}
      >
        <div className="space-y-1">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              aria-label={`Read ${firstChoice.title} at level ${choice.cefrLevel.toUpperCase()}`}
              onClick={() => {
                mobileNavigationHrefRef.current = getHref(choice);
                mobileSheetRef.current?.close();
              }}
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left outline-none transition-colors hover:bg-muted active:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="text-base font-semibold uppercase">
                {choice.cefrLevel}
              </span>
              <span className="flex items-center gap-2">
                <ConversationState isRead={choice.isRead} />
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </span>
            </button>
          ))}
        </div>
      </SwipeableBottomSheet>
    </>
  );
};
