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
import type { LinkChatSession } from "@/lib/link-chat-store";
import { isProcessingStatus, isReadyStatus } from "@/lib/link-chat-store";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type ChatSidebarProps = {
  chats: LinkChatSession[];
  activeChatId?: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
};

function groupChats(chats: LinkChatSession[]) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets: Record<string, LinkChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const c of chats) {
    const diffDays = Math.floor((now - c.createdAt) / dayMs);
    if (diffDays <= 0) buckets["Today"].push(c);
    else if (diffDays === 1) buckets["Yesterday"].push(c);
    else if (diffDays <= 7) buckets["Last 7 days"].push(c);
    else buckets["Older"].push(c);
  }

  return Object.entries(buckets).filter(([, items]) => items.length > 0);
}

function getStatusLabel(chat: LinkChatSession): string {
  if (isProcessingStatus(chat.status)) {
    return chat.status === "pending" ? "starting..." : `${chat.status}...`;
  }
  if (chat.status === "failed") {
    return "failed";
  }
  return "";
}

function getStatusColor(chat: LinkChatSession): string {
  if (isProcessingStatus(chat.status)) {
    return "text-primary";
  }
  if (chat.status === "failed") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

function ChatSkeletonLoader() {
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
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  isLoading = false,
}: ChatSidebarProps) {
  const grouped = useMemo(() => groupChats(chats), [chats]);

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
            onClick={onNewChat}
            disabled={isLoading}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>
        {isLoading ? (
          <>
            <ChatSkeletonLoader />
            <ChatSkeletonLoader />
          </>
        ) : grouped.length ? (
          grouped.map(([label, items]) => (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((chat) => {
                  const statusLabel = getStatusLabel(chat);
                  const statusColor = getStatusColor(chat);

                  return (
                    <SidebarMenuButton
                      key={chat.id}
                      isActive={chat.id === activeChatId}
                      onClick={() => onSelectChat(chat.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">
                        {chat.companyName || chat.title}
                      </span>
                      {statusLabel && (
                        <span
                          className={cn(
                            "ml-auto text-[10px]",
                            statusColor,
                            isProcessingStatus(chat.status) && "animate-pulse"
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
            No chats yet — click <span className="font-medium">New Chat</span>{" "}
            to paste a link.
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
