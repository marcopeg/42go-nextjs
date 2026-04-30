"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DisplayDate } from "@/42go/components/DisplayDate";
import { Project } from "../hooks/useQuicklistsData";

export interface ProjectItemProps {
  project: Project;
}

export function ProjectItem({ project }: ProjectItemProps) {
  return (
    <li key={project.id} className="p-3 hover:bg-muted/20">
      <Link
        href={`/quicklists/${project.id}`}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <div className="font-medium">
            {project.title}{" "}
            {project.owned ? (
              <span className="ml-2 text-xs rounded px-2 py-0.5 bg-green-600/15 text-green-700 dark:text-green-400 border border-green-600/30">
                owner
              </span>
            ) : (
              <span className="ml-2 text-xs rounded px-2 py-0.5 bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30">
                {project.role}
              </span>
            )}
          </div>
          <DisplayDate
            date={project.updated_at}
            className="text-xs text-muted-foreground"
          />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </li>
  );
}