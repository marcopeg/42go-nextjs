"use client";

import Link from "next/link";
import { Check, ChevronRight, MessageCircle, Star } from "lucide-react";

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
import { ConversationTranslatableText } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation";
import type { ReaderTranslationScope } from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";

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
}: {
  categories: ConversationCategory[];
  getHref: (category: ConversationCategory) => string;
  flush?: boolean;
}) => (
  <PlainList
    bleedMobile={!flush}
    className={cn(flush && "border-t-0 md:rounded-none md:border-x-0")}
  >
    {categories.map((category) => (
      <PlainListItem key={category.id}>
        <Link
          href={getHref(category)}
          className="flex min-h-16 w-full items-start gap-3 px-6 py-3 text-left outline-none transition-[filter,box-shadow] hover:brightness-[0.98] focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-110 md:py-4"
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
          <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </Link>
      </PlainListItem>
    ))}
  </PlainList>
);

export const ConversationChoiceRow = ({
  choice,
  href,
  targetLanguage,
  scope,
  showContext = false,
  onStarChange,
  starPending = false,
}: {
  choice: ConversationChoice;
  href: string;
  targetLanguage: string | null;
  scope: ReaderTranslationScope;
  showContext?: boolean;
  onStarChange?: (choice: ConversationChoice) => void;
  starPending?: boolean;
}) => (
  <div className="flex min-w-0 items-stretch">
    <div className="min-w-0 flex-1 space-y-1 px-5 py-4">
      <ConversationTranslatableText
        text={choice.title}
        sourceLanguage={choice.language}
        targetLanguage={targetLanguage}
        context={{ kind: "conversation", conversationId: choice.id }}
        scope={scope}
        idPrefix={`conversation:${choice.id}:title`}
        className="font-medium text-foreground"
      />
      {choice.description ? (
        <ConversationTranslatableText
          text={choice.description}
          sourceLanguage={choice.language}
          targetLanguage={targetLanguage}
          context={{ kind: "conversation", conversationId: choice.id }}
          scope={scope}
          idPrefix={`conversation:${choice.id}:description`}
          className="line-clamp-2 text-sm text-muted-foreground"
        />
      ) : null}
      {showContext && (choice.scenarioTitle || choice.variantTitle) ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
          {choice.scenarioTitle ? (
            <ConversationTranslatableText
              text={choice.scenarioTitle}
              sourceLanguage={choice.scenarioLocalization?.language ?? choice.scenarioCanonicalLanguage ?? "en"}
              targetLanguage={targetLanguage}
              context={{ kind: "conversation", conversationId: choice.id }}
              scope={scope}
              idPrefix={`conversation:${choice.id}:scenario:title`}
            />
          ) : null}
          {choice.scenarioTitle && choice.variantTitle ? <span aria-hidden="true">·</span> : null}
          {choice.variantTitle ? (
            <ConversationTranslatableText
              text={choice.variantTitle}
              sourceLanguage={choice.variantLocalization?.language ?? choice.variantCanonicalLanguage ?? "en"}
              targetLanguage={targetLanguage}
              context={{ kind: "conversation", conversationId: choice.id }}
              scope={scope}
              idPrefix={`conversation:${choice.id}:variant:title`}
            />
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ConversationBadge>{choice.language}</ConversationBadge>
        <ConversationBadge>{choice.cefrLevel}</ConversationBadge>
        <ConversationState isRead={choice.isRead} />
      </div>
    </div>
    <Link
      href={href}
      aria-label={`Open ${choice.title}`}
      className="my-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
    {onStarChange ? (
      <button
        type="button"
        aria-label={choice.isStarred ? `Unstar ${choice.title}` : `Star ${choice.title}`}
        aria-pressed={choice.isStarred}
        disabled={starPending}
        onClick={() => onStarChange(choice)}
        className="m-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <Star
          aria-hidden="true"
          className={cn("size-5", choice.isStarred && "fill-primary text-primary")}
        />
      </button>
    ) : null}
  </div>
);
