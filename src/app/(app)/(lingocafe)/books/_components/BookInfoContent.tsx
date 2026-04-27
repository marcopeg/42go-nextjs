import Link from "next/link";
import { BookOpen } from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { BookTags } from "@/app/(app)/(lingocafe)/books/_components/BookTags";
import type { ReaderBookInfo } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { Button } from "@/components/ui/button";

type BookInfoContentProps = {
  book: ReaderBookInfo;
};

const BookReadingAction = ({
  action,
}: {
  action: ReaderBookInfo["readingAction"];
}) => {
  if (!action.href) {
    return (
      <Button disabled className="w-full sm:w-auto">
        <BookOpen className="h-4 w-4" />
        {action.label}
      </Button>
    );
  }

  return (
    <Button asChild className="w-full sm:w-auto">
      <Link href={action.href}>
        <BookOpen className="h-4 w-4" />
        {action.label}
      </Link>
    </Button>
  );
};

export const BookInfoContent = ({ book }: BookInfoContentProps) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-start md:gap-8">
    <BookCover
      book={book}
      className="mx-auto w-full max-w-72 md:mx-0 md:w-64 md:max-w-64 md:shrink-0 lg:w-72 lg:max-w-72"
      sizes="(min-width: 1024px) 288px, (min-width: 768px) 256px, 100vw"
    />

    <section className="min-w-0 flex-1 space-y-5">
      <div className="space-y-2">
        <h2 className="break-words text-2xl font-semibold tracking-normal md:text-3xl">
          {book.title}
        </h2>
        <p className="text-base text-muted-foreground">{book.author}</p>
      </div>

      <BookTags tags={book.tags} />

      <BookReadingAction action={book.readingAction} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          Description
        </h3>
        <p className="whitespace-pre-wrap break-words text-base leading-7">
          {book.description}
        </p>
      </div>
    </section>
  </div>
);
