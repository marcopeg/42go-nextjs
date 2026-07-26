"use client";

import { ListTodo } from "lucide-react";

export const ProjectsEmptyState = () => {
  return (
    <div className="px-6 py-12 text-center md:mt-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ListTodo className="size-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">
        No lists yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first list and get things moving.
      </p>
    </div>
  );
};
