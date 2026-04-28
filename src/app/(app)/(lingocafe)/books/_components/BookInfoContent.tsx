"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe2,
  GraduationCap,
  Heart,
  type LucideIcon,
  MoreHorizontal,
} from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { BookTags } from "@/app/(app)/(lingocafe)/books/_components/BookTags";
import type {
  ReaderBookInfo,
  ReaderBookInfoPage,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BookInfoContentProps = {
  book: ReaderBookInfo;
};

type MetaItemProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

const languageNames: Record<string, string> = {
  en: "English",
  sv: "Swedish",
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  pl: "Polish",
  cs: "Czech",
  el: "Greek",
};

const formatLanguage = (lang: string) =>
  `${languageNames[lang.toLowerCase()] || lang.toUpperCase()} (${lang.toUpperCase()})`;

const formatCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const MetaItem = ({ icon: Icon, label, value }: MetaItemProps) => (
  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </div>
    <span className="min-w-0 truncate text-foreground">
      {value}
    </span>
  </div>
);

const MobileMetaItem = ({
  icon: Icon,
  value,
  className,
}: Omit<MetaItemProps, "label"> & { className?: string }) => (
  <div
    className={cn(
      "flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground",
      className
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
  </div>
);

const BookReadingAction = ({
  action,
}: {
  action: ReaderBookInfo["readingAction"];
}) => {
  const label = action.kind === "start" ? "Start reading" : action.label;

  if (!action.href) {
    return (
      <Button disabled className="h-12 w-full rounded-md bg-foreground text-background">
        <BookOpen className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button asChild className="h-12 w-full rounded-md bg-foreground text-background hover:bg-foreground/90">
      <Link href={action.href}>
        <BookOpen className="size-4" />
        {label}
      </Link>
    </Button>
  );
};

const SecondaryActionPlaceholder = ({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) => (
  <span
    aria-label={`${label} not available yet`}
    className="grid h-12 flex-1 place-items-center rounded-md border bg-background text-foreground shadow-sm md:size-12 md:flex-none"
    role="img"
  >
    <Icon className="size-5" strokeWidth={2} />
  </span>
);

const BookInfoSecondaryActions = () => (
  <div className="flex gap-3">
    <SecondaryActionPlaceholder icon={Bookmark} label="Bookmark" />
    <SecondaryActionPlaceholder icon={Heart} label="Favorite" />
    <SecondaryActionPlaceholder icon={MoreHorizontal} label="More actions" />
  </div>
);

const BookAbout = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-normal">About this book</h2>
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-6 text-foreground md:text-base md:leading-7",
          !expanded && "line-clamp-4 md:line-clamp-none"
        )}
      >
        {description}
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary md:hidden"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Read less" : "Read more"}
        <ChevronDown
          className={cn("size-4 transition-transform", expanded && "rotate-180")}
        />
      </button>
    </section>
  );
};

const BookInfoContents = ({ pages }: { pages: ReaderBookInfoPage[] }) => {
  const [showAll, setShowAll] = useState(false);
  const visiblePages = showAll ? pages : pages.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-normal">Contents</h2>
        <span className="text-sm text-muted-foreground">
          {formatCount(pages.length, "chapter", "chapters")}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        {pages.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            No chapters available.
          </div>
        ) : (
          visiblePages.map((page) => (
            <Link
              key={page.pageId}
              href={page.href}
              className="grid min-h-12 grid-cols-[2rem_1fr_auto] items-center gap-3 border-b px-3 py-3 text-sm last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-center text-muted-foreground">
                {page.position}
              </span>
              <span className="min-w-0 truncate font-medium">
                {page.title}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="hidden sm:inline">{page.prefix || "Chapter"}</span>
                <ChevronRight className="size-4" />
              </span>
            </Link>
          ))
        )}
      </div>

      {pages.length > 4 && (
        <button
          type="button"
          className="mx-auto flex items-center gap-2 text-sm text-muted-foreground"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show fewer chapters" : "Show all chapters"}
          <ChevronDown
            className={cn("size-4 transition-transform", showAll && "rotate-180")}
          />
        </button>
      )}
    </section>
  );
};

export const BookInfoContent = ({ book }: BookInfoContentProps) => {
  const pageCount = book.pages.length;

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden md:w-full md:max-w-5xl md:overflow-visible md:pl-10 md:space-y-10">
      <div className="grid min-w-0 max-w-full gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <aside className="mx-auto w-full max-w-full overflow-hidden md:sticky md:top-24 md:max-w-none">
          <BookCover
            book={book}
            className="max-w-full rounded-none border-0 md:rounded-lg md:border"
            sizes="(min-width: 1024px) 256px, (min-width: 768px) 224px, 88vw"
          />

          <div className="mt-5 hidden gap-3 py-4 md:grid">
            <MetaItem icon={GraduationCap} label="Level" value={book.level.toUpperCase()} />
            <MetaItem icon={Globe2} label="Language" value={formatLanguage(book.lang)} />
            <MetaItem icon={FileText} label="Pages" value={String(pageCount)} />
          </div>
        </aside>

        <section className="min-w-0 max-w-full space-y-5">
          <div className="space-y-2">
            <h1 className="break-words text-2xl font-semibold tracking-normal md:text-4xl">
              {book.title}
            </h1>
            <p className="break-words text-base text-muted-foreground md:text-lg">
              {book.author}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:hidden">
            <MobileMetaItem
              icon={GraduationCap}
              value={book.level.toUpperCase()}
              className="justify-start"
            />
            <MobileMetaItem
              icon={Globe2}
              value={book.lang.toUpperCase()}
              className="justify-center"
            />
            <MobileMetaItem
              icon={FileText}
              value={String(pageCount)}
              className="justify-end"
            />
          </div>

          <BookTags tags={book.tags} />

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>Adapted by LingoCafe</p>
            <p>Based on demo source material</p>
          </div>

          <BookAbout description={book.description} />

          <div className="grid gap-3 md:flex md:items-center">
            <div className="md:w-56">
              <BookReadingAction action={book.readingAction} />
            </div>
            <BookInfoSecondaryActions />
          </div>

          <BookInfoContents pages={book.pages} />
        </section>
      </div>
    </div>
  );
};
