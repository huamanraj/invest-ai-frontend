import { ChatContainerContent, ChatContainerRoot } from "@/components/ui/chat-container";
import { ScrollButton } from "@/components/ui/scroll-button";
import { ChatMessage } from "./chat-message";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesContainerProps {
  messages: Message[];
  containerRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessagesContainer({
  messages,
  containerRef,
}: ChatMessagesContainerProps) {
  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto">
      <ChatContainerRoot className="h-full">
        <ChatContainerContent className="space-y-0 px-5 py-12">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}
        </ChatContainerContent>
        <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
          <ScrollButton className="shadow-sm" />
        </div>
      </ChatContainerRoot>
    </div>
  );
}
