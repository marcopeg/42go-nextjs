import Link from "next/link";
import { BookCheck, MoreHorizontal, Undo2 } from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  getTitleTypography,
  parseBookTitle,
} from "@/app/(app)/(lingocafe)/books/_components/bookshelf";
import { useBookCompletionMutation } from "@/app/(app)/(lingocafe)/books/_components/useBookCompletionMutation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BookCardProps = {
  book: ReaderBook;
  onCompletedAtChange: (completedAt: string | null) => void;
};

const levelPattern = /(?:^|[-_])(a1|a2|b1|b2|c1|c2)(?:$|[-_])/i;

const getBookLevelLabel = (book: ReaderBook) => {
  const level = book.level.trim() || book.id.match(levelPattern)?.[1] || "";
  return level ? level.toUpperCase() : null;
};

export const BookCard = ({ book, onCompletedAtChange }: BookCardProps) => {
  const coverTags = book.tags.slice(0, 3);
  const levelLabel = getBookLevelLabel(book);
  const { mainTitle, volumeLabel, subtitle } = parseBookTitle(
    book.title,
    book.project,
    book.lang,
    book.id
  );
  const { sizeClass, clampClass } = getTitleTypography(mainTitle);
  const author = book.author.trim();
  const readingHref = book.readingAction.href;
  const isReading =
    !book.completedAt &&
    book.readingAction.kind === "resume" &&
    typeof readingHref === "string";
  const href = isReading
    ? readingHref
    : `/books/${encodeURIComponent(book.id)}`;
  const ariaLabel = isReading
    ? `Continue reading ${book.title}`
    : `Open ${book.title} details`;
  const isCompleted = book.completedAt !== null;
  const { pending, setCompleted } = useBookCompletionMutation({
    bookId: book.id,
    onCompletedAtChange,
  });

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-lg shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring/60">
      <Link
        href={href}
        className="relative block min-w-0 overflow-hidden rounded-lg outline-none"
        aria-label={ariaLabel}
      >
        <BookCover
          book={book}
          className="w-full rounded-lg border-0"
          imageClassName="object-cover"
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/85 via-black/45 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
        />

        {isReading ? (
          <div className="absolute inset-x-0 bottom-0 z-20 h-0.5 bg-emerald-500 shadow-sm" />
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 p-2.5 pr-10 sm:p-4 sm:pr-14">
          {volumeLabel ? (
            <div className="mb-0.5 inline-flex items-center">
              <span className="rounded bg-amber-400/95 px-1.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-black shadow-sm sm:text-xs">
                {volumeLabel}
              </span>
            </div>
          ) : null}
          <h2 className={`${clampClass} ${sizeClass} [overflow-wrap:anywhere] font-serif font-bold tracking-normal text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]`}>
            {mainTitle}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 truncate text-[0.68rem] font-medium text-amber-100/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs">
              {subtitle}
            </p>
          ) : author ? (
            <p className="mt-0.5 line-clamp-1 truncate text-[0.68rem] font-medium text-amber-100/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs">
              by {author}
            </p>
          ) : null}
        </div>

        {(coverTags.length > 0 || levelLabel || isReading) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1 p-2.5 pr-11 sm:gap-2 sm:p-4 sm:pr-14">
              {isReading ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm sm:px-2 sm:text-xs">
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  Reading
                </span>
              ) : null}
              {coverTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded bg-black/50 px-1.5 py-0.5 text-[0.62rem] font-medium leading-none text-amber-50 shadow-sm backdrop-blur-sm sm:rounded-md sm:px-2 sm:py-1 sm:text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {levelLabel ? (
              <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-tl-md bg-white text-xs font-extrabold leading-none text-black shadow-md ring-1 ring-black/10 sm:size-10 sm:text-base">
                {levelLabel}
              </span>
            ) : null}
          </div>
        )}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="neutralGhost"
            size="icon"
            disabled={pending}
            aria-label={`More actions for ${book.title}`}
            className="absolute right-2 top-2 z-20 size-8 rounded-full border border-white/30 bg-black/55 text-white shadow-sm backdrop-blur-sm hover:bg-black/70 hover:text-white focus-visible:ring-white/70 sm:right-3 sm:top-3 sm:size-10"
          >
            <MoreHorizontal className="size-4 sm:size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => {
              void setCompleted(!isCompleted);
            }}
          >
            {isCompleted ? (
              <Undo2 className="size-4" />
            ) : (
              <BookCheck className="size-4" />
            )}
            {isCompleted ? "Mark as unread" : "Mark as read"}
          </DropdownMenuItem>
          {isReading ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => {
                void setCompleted(false, { resetProgress: true });
              }}
            >
              <Undo2 className="size-4" />
              Mark as unread
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
};
