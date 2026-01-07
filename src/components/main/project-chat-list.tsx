"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, PlusIcon } from "lucide-react";
import { useChatsStore, type ChatWithMessages } from "@/lib/stores/chats-store";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ProjectChatListProps = {
  projectId: string;
  activeChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
};

function formatChatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

export function ProjectChatList({
  projectId,
  activeChatId,
  onSelectChat,
  onCreateChat,
}: ProjectChatListProps) {
  const { chatsByProject, isLoading } = useChatsStore();
  const chats = chatsByProject[projectId] || [];
  const loading = isLoading[projectId] || false;

  if (loading && chats.length === 0) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col h-full">
        <div className="px-4 py-2 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent chats
          </h3>
        </div>
        <div className="px-2 py-2 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-3 py-2 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recent chats
        </h3>
      </div>
      <ScrollArea className="flex-1 h-full w-full">
        <div className="px-2 py-2 space-y-1">
          {chats.map((chat) => {
            const timeText = formatChatDate(chat.updated_at);

            return (
              <Button
                key={chat.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 h-auto py-2 px-3",
                  activeChatId === chat.id && "bg-muted"
                )}
                onClick={() => onSelectChat(chat.id)}
              >
                <MessageSquare className="size-4 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">
                    {chat.title}
                  </div>
                  {timeText && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {timeText}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
