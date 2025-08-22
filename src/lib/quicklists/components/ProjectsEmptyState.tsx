"use client";

import { ListTodo } from "lucide-react";

export function ProjectsEmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No lists yet</p>
      <p className="text-sm">
        Create your first list to get started
      </p>
    </div>
  );
}