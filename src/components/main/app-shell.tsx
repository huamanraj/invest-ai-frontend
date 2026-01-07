"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectsStore } from "@/lib/stores/projects-store";
import { useChatsStore } from "@/lib/stores/chats-store";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const params = useParams<{ projectId?: string }>();
  const activeProjectId =
    typeof params?.projectId === "string" ? params.projectId : null;

  const { projects, fetchProjects, subscribeToProject } = useProjectsStore();
  const { fetchChats } = useChatsStore();

  const eventSourceCleanupRef = useRef<(() => void) | null>(null);

  // Fetch projects on mount (only once for the entire app)
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Subscribe to project events when viewing a processing project
  useEffect(() => {
    if (eventSourceCleanupRef.current) {
      eventSourceCleanupRef.current();
      eventSourceCleanupRef.current = null;
    }

    if (!activeProjectId) return;

    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;

    const isProcessing =
      project.status !== "completed" && project.status !== "failed";

    if (!isProcessing) return;

    const cleanup = subscribeToProject(activeProjectId, {
      onStatus: () => {
        // Status updated via store
      },
      onComplete: () => {
        // Project completed, refresh chats
        if (activeProjectId) {
          fetchChats(activeProjectId);
        }
      },
      onError: (error) => {
        console.error("Project processing error:", error);
      },
    });

    eventSourceCleanupRef.current = cleanup;

    return () => {
      if (eventSourceCleanupRef.current) {
        eventSourceCleanupRef.current();
        eventSourceCleanupRef.current = null;
      }
    };
  }, [activeProjectId, projects, subscribeToProject, fetchChats]);

  const handleNewProject = useCallback(() => {
    router.push(`/`);
  }, [router]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      router.push(`/project/${projectId}`);
    },
    [router]
  );

  return (
    <SidebarProvider>
      <ChatSidebar
        activeProjectId={activeProjectId}
        onNewProject={handleNewProject}
        onSelectProject={handleSelectProject}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
