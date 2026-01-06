"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeIndianRupee, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useProjectsStore } from "@/lib/stores/projects-store";
import type { ProjectStatus, Project } from "@/lib/projects-api";

type ChatSidebarProps = {
  activeProjectId?: string | null;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
};

function groupProjects(projects: Project[]) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets: Record<string, typeof projects> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const p of projects) {
    const createdAt = new Date(p.created_at).getTime();
    const diffDays = Math.floor((now - createdAt) / dayMs);
    if (diffDays <= 0) buckets["Today"].push(p);
    else if (diffDays === 1) buckets["Yesterday"].push(p);
    else if (diffDays <= 7) buckets["Last 7 days"].push(p);
    else buckets["Older"].push(p);
  }

  return Object.entries(buckets).filter(([, items]) => items.length > 0);
}

function getStatusLabel(status: ProjectStatus): string {
  const processingStatuses: ProjectStatus[] = [
    "pending",
    "scraping",
    "downloading",
    "parsing",
    "embedding",
  ];
  if (processingStatuses.includes(status)) {
    return status === "pending" ? "starting..." : `${status}...`;
  }
  if (status === "failed") {
    return "failed";
  }
  return "";
}

function getStatusColor(status: ProjectStatus): string {
  const processingStatuses: ProjectStatus[] = [
    "pending",
    "scraping",
    "downloading",
    "parsing",
    "embedding",
  ];
  if (processingStatuses.includes(status)) {
    return "text-primary";
  }
  if (status === "failed") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

function isProcessingStatus(status: ProjectStatus): boolean {
  return ["pending", "scraping", "downloading", "parsing", "embedding"].includes(
    status
  );
}

function ProjectSkeletonLoader() {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <Skeleton className="h-4 w-16" />
        </SidebarGroupLabel>
        <SidebarMenu>
          {[...Array(3)].map((_, i) => (
            <SidebarMenuButton key={i} disabled className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </SidebarMenuButton>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

export function ChatSidebar({
  activeProjectId,
  onNewProject,
  onSelectProject,
}: ChatSidebarProps) {
  const { projects, isLoading } = useProjectsStore();
  const grouped = useMemo(() => groupProjects(projects), [projects]);

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <BadgeIndianRupee className="size-8 text-primary" />
          <div className="text-md font-base text-primary tracking-tight">
            Invest AI
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={onNewProject}
            disabled={isLoading}
          >
            <PlusIcon className="size-4" />
            <span>New Project</span>
          </Button>
        </div>
        {isLoading ? (
          <>
            <ProjectSkeletonLoader />
            <ProjectSkeletonLoader />
          </>
        ) : grouped.length ? (
          grouped.map(([label, items]) => (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((project) => {
                  const statusLabel = getStatusLabel(project.status);
                  const statusColor = getStatusColor(project.status);

                  return (
                    <SidebarMenuButton
                      key={project.id}
                      isActive={project.id === activeProjectId}
                      onClick={() => onSelectProject(project.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">
                        {project.name || project.company_name}
                      </span>
                      {statusLabel && (
                        <span
                          className={cn(
                            "ml-auto text-[10px]",
                            statusColor,
                            isProcessingStatus(project.status) && "animate-pulse"
                          )}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </SidebarMenuButton>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))
        ) : (
          <div className="text-muted-foreground px-4 text-xs">
            No projects yet — click <span className="font-medium">New Project</span>{" "}
            to create one.
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
