"use client";

import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";

const books = [
  {
    title: "The Little Prince",
    author: "Antoine de Saint-Exupery",
    status: "Reading next",
  },
  {
    title: "Charlotte's Web",
    author: "E. B. White",
    status: "Queued",
  },
  {
    title: "Matilda",
    author: "Roald Dahl",
    status: "Queued",
  },
  {
    title: "The Hobbit",
    author: "J. R. R. Tolkien",
    status: "Bonus pick",
  },
];

export default function BooksPage() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  return (
    <AppLayout
      title="Books"
      subtitle="A tiny fake reading list for LingoCafe."
      stickyHeader={true}
    >
      <div className="space-y-4">
        {books.map((book) => (
          <div
            key={book.title}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{book.title}</h2>
                <p className="text-sm text-muted-foreground">{book.author}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {book.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
