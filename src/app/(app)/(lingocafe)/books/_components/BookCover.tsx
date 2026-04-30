"use client";

import { useState } from "react";
import Image from "next/image";

import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookCoverProps = {
  book: Pick<ReaderBook, "title" | "cover" | "coverFallback">;
  className?: string;
  sizes?: string;
};

export const BookCover = ({
  book,
  className = "w-full min-w-0 max-w-full sm:w-44 sm:max-w-44 sm:shrink-0 lg:w-40 xl:w-44",
  sizes = "(min-width: 1280px) 176px, (min-width: 1024px) 160px, (min-width: 640px) 176px, 100vw",
}: BookCoverProps) => {
  const [src, setSrc] = useState(book.cover || book.coverFallback);

  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-md border bg-muted ${className}`}
    >
      <Image
        src={src}
        alt={`${book.title} cover`}
        fill
        sizes={sizes}
        className="object-contain"
        onError={() => {
          if (src !== book.coverFallback) {
            setSrc(book.coverFallback);
          }
        }}
      />
    </div>
  );
};
