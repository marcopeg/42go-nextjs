import Link from "next/link";
// import { Heart, MoreHorizontal } from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookCardProps = {
  book: ReaderBook;
};

// const MorePlaceholder = () => (
//   <span
//     aria-hidden="true"
//     className="pointer-events-none absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border/60 backdrop-blur-sm"
//   >
//     <MoreHorizontal className="size-5" strokeWidth={2.5} />
//   </span>
// );
//
// const FavoritePlaceholder = () => (
//   <span
//     aria-hidden="true"
//     className="pointer-events-none grid size-9 shrink-0 place-items-center rounded-full text-foreground"
//   >
//     <Heart className="size-5" strokeWidth={2.2} />
//   </span>
// );

export const BookCard = ({ book }: BookCardProps) => {
  const coverTags = book.tags.slice(0, 3);
  const author = book.author.trim();
  const readingHref = book.readingAction.href;
  const isReading =
    book.readingAction.kind === "resume" && typeof readingHref === "string";
  const href = isReading
    ? readingHref
    : `/books/${encodeURIComponent(book.id)}`;
  const ariaLabel = isReading
    ? `Continue reading ${book.title}`
    : `Open ${book.title} details`;

  return (
    <article className="group min-w-0 overflow-hidden rounded-lg shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring/60">
      <Link
        href={href}
        className="relative block min-w-0 outline-none"
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
          className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/70 via-black/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
        />
        {isReading ? (
          <div className="pointer-events-none absolute right-0 top-0 z-10 bg-green-600 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-md sm:text-xs">
            Reading
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
          <h2 className="line-clamp-3 break-words font-serif text-[1.05rem] font-bold leading-tight tracking-normal text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] sm:text-xl md:text-2xl">
            {book.title}
          </h2>
          {author ? (
            <p className="mt-1 line-clamp-1 truncate text-xs font-medium text-amber-100/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-sm">
              by {author}
            </p>
          ) : null}
        </div>

        {coverTags.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-3 sm:gap-2 sm:p-4">
            {coverTags.map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-md bg-black/45 px-2 py-1 text-[0.65rem] font-medium leading-none text-amber-50 shadow-sm backdrop-blur-sm sm:text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
};
