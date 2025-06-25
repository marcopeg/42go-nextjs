"use client";

import Link from "next/link";
import { ThemeToggle } from "@/lib/config/ThemeToggle";

export const Nav = () => {
  return (
    <nav className="w-full flex gap-4 p-4 border-b bg-gray-50 dark:bg-gray-800 dark:text-white mb-6">
      <Link href="/" className="font-semibold hover:underline">
        Home
      </Link>
      <Link href="/todos" className="font-semibold hover:underline">
        Todos
      </Link>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
};
