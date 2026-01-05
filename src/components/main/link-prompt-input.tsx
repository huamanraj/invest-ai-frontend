"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link2, Loader2, Sparkles } from "lucide-react";

export type LinkPromptInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
  variant?: "bottom" | "center";
  className?: string;
};

export function LinkPromptInput({
  value,
  onValueChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  error,
  placeholder = "Paste a link to chat with…",
  variant = "bottom",
  className,
}: LinkPromptInputProps) {
  const inner = (
    <div
      className={cn(
        "border-input bg-popover relative z-10 w-full rounded-3xl border p-4 shadow-xs",
        disabled && "opacity-60"
      )}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch">
          <div className="text-muted-foreground hidden shrink-0 items-center justify-center rounded-full border bg-card sm:inline-flex sm:size-10">
            <Link2 className="size-4" />
          </div>

          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            inputMode="url"
            className="h-11 text-center sm:text-left"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
          />

          <Button
            className="h-11 w-full rounded-full px-5 sm:w-auto"
            onClick={onSubmit}
            disabled={disabled || isLoading || !value.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Start
              </>
            )}
          </Button>
        </div>

        {error ? (
          <div className="text-destructive px-1 text-center text-xs">
            {error}
          </div>
        ) : (
          <div className="text-muted-foreground px-1 text-center text-xs">
            This will create a background scrape job (UI only for now).
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "center") {
    return (
      <div className={cn("w-full max-w-3xl", className)}>
        {inner}
      </div>
    );
  }

  return (
    <div className="z-10 shrink-0 px-3 pb-4 md:px-5 md:pb-6">
      <div className="mx-auto max-w-3xl">
        {inner}
      </div>
    </div>
  );
}


