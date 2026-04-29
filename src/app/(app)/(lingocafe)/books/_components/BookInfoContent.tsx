"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
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
  collapsedDescriptionMinWords: number;
};

type MetaItemProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type BookContentsPart = {
  kind: "part";
  page: ReaderBookInfoPage;
  chapters: ReaderBookInfoPage[];
};

type BookContentsNode =
  | BookContentsPart
  | {
      kind: "chapter";
      page: ReaderBookInfoPage;
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

const isChapterPage = (page: ReaderBookInfoPage) =>
  page.kind.toLowerCase() === "chapter";

const isPartPage = (page: ReaderBookInfoPage) =>
  page.kind.toLowerCase() === "part";

const getChapterCount = (pages: ReaderBookInfoPage[]) =>
  pages.filter(isChapterPage).length;

const buildBookContentsTree = (pages: ReaderBookInfoPage[]) =>
  pages.reduce<BookContentsNode[]>((nodes, page) => {
    if (isPartPage(page)) {
      nodes.push({ kind: "part", page, chapters: [] });
      return nodes;
    }

    if (isChapterPage(page)) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode?.kind === "part") {
        lastNode.chapters.push(page);
      } else {
        nodes.push({ kind: "chapter", page });
      }
    }

    return nodes;
  }, []);

const formatContentsLabel = (page: ReaderBookInfoPage) =>
  page.prefix || `${page.kind.charAt(0).toUpperCase()}${page.kind.slice(1)}`;

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
  const ctaClassName =
    "h-12 w-full rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/40 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400";

  if (!action.href) {
    return (
      <Button disabled className={ctaClassName}>
        <BookOpen className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button asChild className={ctaClassName}>
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

const bookDescriptionMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-3 mt-5 break-words text-base font-semibold tracking-normal md:text-lg">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-3 mt-5 break-words text-base font-semibold tracking-normal md:text-lg">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-5 break-words text-base font-semibold tracking-normal md:text-lg">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 break-words text-sm font-semibold tracking-normal md:text-base">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-4 break-words text-sm leading-6 text-foreground md:text-base md:leading-7">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 md:text-base md:leading-7">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-5 text-sm leading-6 md:text-base md:leading-7">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="break-words pl-1">{children}</li>,
  a: ({ children, href }) => (
    <a
      className="font-medium text-primary underline underline-offset-4"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{children}</code>
  ),
};

const BookDescriptionMarkdown = ({ source }: { source: string }) => (
  <div className="min-w-0 max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
    <ReactMarkdown
      allowedElements={[
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "em",
        "strong",
        "a",
        "ul",
        "ol",
        "li",
        "br",
        "code",
      ]}
      components={bookDescriptionMarkdownComponents}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  </div>
);

const getMarkdownParagraphs = (source: string) =>
  source
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const countMarkdownWords = (source: string) =>
  source
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[`*_~>#-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const getCollapsedMarkdownDescription = (
  source: string,
  minWords: number
) => {
  const paragraphs = getMarkdownParagraphs(source);
  const selected: string[] = [];
  let wordCount = 0;

  for (const paragraph of paragraphs) {
    selected.push(paragraph);
    wordCount += countMarkdownWords(paragraph);
    if (wordCount >= minWords) break;
  }

  return selected.join("\n\n") || source;
};

const hasMultipleMarkdownParagraphs = (source: string) =>
  getMarkdownParagraphs(source).length > 1;

const BookAbout = ({
  description,
  collapsedDescriptionMinWords,
}: {
  description: string;
  collapsedDescriptionMinWords: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const displayDescription = expanded
    ? description
    : getCollapsedMarkdownDescription(description, collapsedDescriptionMinWords);
  const canExpand = hasMultipleMarkdownParagraphs(description);

  return (
    <section className="space-y-3">
      <div className="h-px w-full bg-border" />
      <div className="break-words">
        <BookDescriptionMarkdown source={displayDescription} />
      </div>
      {canExpand && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Read less" : "Read more"}
          <ChevronDown
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      )}
    </section>
  );
};

const BookContentsEntry = ({
  page,
  variant,
}: {
  page: ReaderBookInfoPage;
  variant: "part" | "chapter";
}) => (
  <Link
    href={page.href}
    className={cn(
      "flex min-w-0 items-center gap-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      variant === "part"
        ? "border-b bg-muted px-5 py-5 hover:bg-muted"
        : "bg-background px-5 py-4 hover:bg-muted/40"
    )}
  >
    <span className="min-w-0 flex-1">
      <span className="block break-words text-muted-foreground italic">
        {formatContentsLabel(page)}
      </span>
      <span className="mt-0.5 block break-words font-semibold text-foreground">
        {page.title}
      </span>
    </span>
    {variant === "chapter" && (
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    )}
  </Link>
);

const BookInfoContents = ({ pages }: { pages: ReaderBookInfoPage[] }) => {
  const contentsTree = buildBookContentsTree(pages);
  const chapterCount = getChapterCount(pages);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-normal">Contents</h2>
        <span className="text-sm text-muted-foreground">
          {formatCount(chapterCount, "chapter", "chapters")}
        </span>
      </div>

      <div className="space-y-3">
        {pages.length === 0 ? (
          <div className="rounded-md border bg-background px-4 py-4 text-sm text-muted-foreground">
            No chapters available.
          </div>
        ) : (
          contentsTree.map((node) => (
            node.kind === "part" ? (
              <div key={node.page.pageId} className="overflow-hidden rounded-md border bg-muted/15">
                <BookContentsEntry page={node.page} variant="part" />
                {node.chapters.length > 0 && (
                  <div className="divide-y">
                    {node.chapters.map((chapter) => (
                      <BookContentsEntry
                        key={chapter.pageId}
                        page={chapter}
                        variant="chapter"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div key={node.page.pageId} className="overflow-hidden rounded-md border bg-muted/15">
                <BookContentsEntry page={node.page} variant="chapter" />
              </div>
            )
          ))
        )}
      </div>
    </section>
  );
};

export const BookInfoContent = ({
  book,
  collapsedDescriptionMinWords,
}: BookInfoContentProps) => {
  const chapterCount = getChapterCount(book.pages);

  return (
    <div className="min-w-0 max-w-full space-y-8 md:w-full md:max-w-5xl md:pl-10 md:space-y-10">
      <div className="grid min-w-0 max-w-full gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <aside className="mx-auto w-full max-w-full overflow-hidden md:sticky md:top-24 md:max-w-none">
          <BookCover
            book={book}
            className="max-w-full rounded-none border-0 md:rounded-lg md:border"
            sizes="(min-width: 1024px) 256px, (min-width: 768px) 224px, 88vw"
          />

          <div className="mt-5 hidden gap-3 py-4 md:grid">
            <MetaItem icon={Globe2} label="Language" value={formatLanguage(book.lang)} />
            <MetaItem icon={GraduationCap} label="Level" value={book.level.toUpperCase()} />
            <MetaItem icon={FileText} label="Chapters" value={String(chapterCount)} />
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
              value={String(chapterCount)}
              className="justify-end"
            />
          </div>

          <BookTags tags={book.tags} />

          <BookAbout
            description={book.description}
            collapsedDescriptionMinWords={collapsedDescriptionMinWords}
          />

          <div className="sticky top-0 z-20 grid gap-3 bg-background/95 py-3 backdrop-blur md:top-16 md:flex md:items-center">
            <div className="md:w-56">
              <BookReadingAction action={book.readingAction} />
            </div>
            <BookInfoSecondaryActions />
          </div>

          <div className="py-5 md:py-7" />

          <BookInfoContents pages={book.pages} />
        </section>
      </div>
    </div>
  );
};
