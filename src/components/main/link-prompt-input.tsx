"use client";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  placeholder = "https://www.bseindia.com/stock-share-price/mps-ltd/mpsltd/532440/financials-annual-reports/",
  variant = "bottom",
  className,
}: LinkPromptInputProps) {
  const inner = (
    <>
      <InputGroup className={cn("w-full py-8 rounded-3xl", disabled && "opacity-60")}>
        <InputGroupInput
          type="url"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          inputMode="url"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="h-14 px-6 py-4 placeholder:opacity-40"
        />
        <InputGroupButton
          type="button"
          onClick={onSubmit}
          disabled={disabled || isLoading || !value.trim()}
          size="icon-sm"
          variant="ghost"
          className="mr-2"
        >
          {!isLoading ? (
            <ArrowUp size={18} />
          ) : (
            <Loader2 className="size-4 animate-spin" />
          )}
        </InputGroupButton>
      </InputGroup>

      {(error || !error) && (
        <div className={cn("mt-2 px-1 text-center text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error || "Paste a BSE India annual report URL to analyze the company financials."}
        </div>
      )}
    </>
  );

  if (variant === "center") {
    return (
      <div className={cn("w-full max-w-3xl", className)}>
        {inner}
      </div>
    );
  }

  return (
    <div className="z-10 shrink-0 px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-3xl">
        {inner}
      </div>
    </div>
  );
}
