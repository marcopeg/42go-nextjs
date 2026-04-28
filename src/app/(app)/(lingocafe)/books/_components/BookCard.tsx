import Link from "next/link";
// import { Heart, MoreHorizontal } from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { BookTags } from "@/app/(app)/(lingocafe)/books/_components/BookTags";
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
  const languageLevel = `${book.lang.toUpperCase()} / ${book.level.toUpperCase()}`;

  return (
    <article className="group w-full min-w-0 max-w-sm overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted/20 focus-within:ring-2 focus-within:ring-ring/50 md:w-56 md:max-w-56 md:self-stretch">
      <Link
        href={`/books/${encodeURIComponent(book.id)}`}
        className="flex h-full min-w-0 max-w-full flex-col outline-none"
        aria-label={`Open ${book.title} details`}
      >
        <div className="relative">
          <BookCover
            book={book}
            className="w-full rounded-b-none border-0"
            sizes="(min-width: 768px) 224px, 92vw"
          />
          {/* <MorePlaceholder /> */}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex min-h-36 min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="line-clamp-4 break-words text-xl font-semibold leading-tight tracking-normal text-foreground">
                {book.title}
              </h2>
              <p className="line-clamp-2 break-words text-base text-muted-foreground">
                {book.author}
              </p>
            </div>
            {/* <FavoritePlaceholder /> */}
          </div>

          <div className="mt-auto space-y-4">
            <span className="inline-flex w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold uppercase text-foreground">
              {languageLevel}
            </span>

            <BookTags tags={book.tags} />
          </div>
        </div>
      </Link>
    </article>
  );
};
