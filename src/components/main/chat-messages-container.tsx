import { ChatContainerContent, ChatContainerRoot } from "@/components/ui/chat-container";
import { ScrollButton } from "@/components/ui/scroll-button";
import { ChatMessage } from "./chat-message";
import type { LinkChatMessage } from "@/lib/link-chat-store";
import { cn } from "@/lib/utils";

interface ChatMessagesContainerProps {
  messages: LinkChatMessage[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  topContent?: React.ReactNode;
}

export function ChatMessagesContainer({
  messages,
  containerRef,
  topContent,
}: ChatMessagesContainerProps) {
  const hasStreamingMessage = messages.some((m) => m.isStreaming);

  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto">
      <ChatContainerRoot className="h-full">
        <ChatContainerContent className={cn("space-y-0 px-5 py-12", hasStreamingMessage && "pb-16")}>
          {topContent}
          {messages.map((message, index) => (
            <div key={message.id} className="py-3">
              <ChatMessage
                message={message}
                isLastMessage={index === messages.length - 1}
              />
            </div>
          ))}
        </ChatContainerContent>
        <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
          <ScrollButton className="shadow-sm" />
        </div>
      </ChatContainerRoot>
    </div>
  );
}
