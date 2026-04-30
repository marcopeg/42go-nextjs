"use client";

import { InviteItem } from "./InviteItem";
import { ProjectItem } from "./ProjectItem";
import { ProjectsEmptyState } from "./ProjectsEmptyState";
import { ProjectsData } from "../hooks/useQuicklistsData";

export interface ProjectsListProps {
  data: ProjectsData;
  busyInvite: string | null;
  onAcceptInvite: (projectId: string) => void;
  onRejectInvite: (projectId: string, email: string) => void;
}

export function ProjectsList({
  data,
  busyInvite,
  onAcceptInvite,
  onRejectInvite,
}: ProjectsListProps) {
  const hasItems = data.invites.length > 0 || data.projects.length > 0;

  return (
    <div className="overflow-hidden md:border md:rounded-md md:mx-6 md:mt-6 md:mb-6">
      {hasItems ? (
        <ul className="divide-y">
          {/* Invitations first */}
          {data.invites.map((invite) => (
            <InviteItem
              key={invite.project_id + invite.email}
              invite={invite}
              busy={busyInvite === invite.project_id}
              onAccept={onAcceptInvite}
              onReject={onRejectInvite}
            />
          ))}
          {/* Projects */}
          {data.projects.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </ul>
      ) : (
        <ProjectsEmptyState />
      )}
    </div>
  );
}