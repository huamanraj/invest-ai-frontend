import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

interface ChatPromptInputProps {
  isLoading: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatPromptInput({
  isLoading,
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
}: ChatPromptInputProps) {
  return (
    <div className=" z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
      <div className="mx-auto max-w-3xl">
        <PromptInput
          isLoading={isLoading}
          value={prompt}
          onValueChange={onPromptChange}
          onSubmit={onSubmit}
          disabled={disabled}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder="Ask anything"
              className="min-h-11 pt-3 pl-4   text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-end gap-2 px-3 pb-3">
              <Button
                size="icon"
                disabled={disabled || !prompt.trim() || isLoading}
                onClick={onSubmit}
                className="size-9 rounded-full"
              >
                {!isLoading ? (
                  <ArrowUp size={18} />
                ) : (
                  <span className="size-3 rounded-xs bg-white" />
                )}
              </Button>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}
