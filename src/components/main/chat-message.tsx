import {
  Message,
  MessageContent,
} from "@/components/ui/message";
import { PulseDotLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: {
    id: string | number;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
  };
  isLastMessage: boolean;
}

export function ChatMessage({ message, isLastMessage }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const isStreaming = message.isStreaming;
  const hasContent = message.content.length > 0;

  return (
    <Message
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
        isAssistant ? "items-start" : "items-end"
      )}
    >
      {isAssistant ? (
        <div className="group flex w-full flex-col gap-0">
          <MessageContent
            className="text-foreground prose prose-sm max-w-none flex-1 rounded-lg bg-transparent p-0 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground prose-blockquote:text-muted-foreground prose-blockquote:border-muted-foreground/30 prose-th:text-foreground prose-td:text-foreground"
            markdown
          >
            {hasContent ? message.content : ""}
          </MessageContent>
          {isStreaming && (
            <div className="mt-2 flex items-center gap-2">
              <PulseDotLoader size="lg" />
            </div>
          )}
        </div>
      ) : (
        <div className="group flex flex-col items-end gap-1">
          <MessageContent className="bg-muted text-primary  rounded-3xl px-5 py-2.5 ">
            {message.content}
          </MessageContent>
        </div>
      )}
    </Message>
  );
}
