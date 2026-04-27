import Link from "next/link";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { BookTags } from "@/app/(app)/(lingocafe)/books/_components/BookTags";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookCardProps = {
  book: ReaderBook;
};

export const BookCard = ({ book }: BookCardProps) => (
  <article className="min-w-0 max-w-full overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted/30 focus-within:ring-2 focus-within:ring-ring/50">
    <Link
      href={`/books/${encodeURIComponent(book.id)}`}
      className="block min-w-0 max-w-full p-4 outline-none sm:p-5"
      aria-label={`Open ${book.title} details`}
    >
      <div className="flex min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:gap-5">
        <BookCover book={book} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="break-words text-lg font-semibold">
                {book.title}
              </h2>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>
            <span className="w-fit shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase">
              {book.lang} / {book.level}
            </span>
          </div>
          <BookTags tags={book.tags} className="mt-4" />
        </div>
      </div>
    </Link>
  </article>
);
