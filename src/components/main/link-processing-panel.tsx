"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought";
import { Skeleton } from "@/components/ui/skeleton";
import { Message, MessageContent } from "@/components/ui/message";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileSearch, Loader2 } from "lucide-react";

export type LinkProcessingPanelProps = {
  step: number; // 0..4
  url: string;
};

export function LinkProcessingPanel({ step, url }: LinkProcessingPanelProps) {
  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col items-start gap-2 px-6">
      <MessageContent className="w-full bg-transparent p-0">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileSearch className="size-4 text-primary" />
            <div className="text-sm font-medium">Scraping link (dummy)</div>
          </div>

          <div className="text-muted-foreground mb-4 truncate text-xs">
            {url}
          </div>

          <ChainOfThought>
            <ChainOfThoughtStep defaultOpen>
              <ChainOfThoughtTrigger
                leftIcon={
                  <CheckCircle2
                    className={cn(
                      "size-4",
                      step >= 1 ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                }
              >
                Validate + create job
              </ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <ChainOfThoughtItem>
                  Creating a background job and locking the link input.
                </ChainOfThoughtItem>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep defaultOpen>
              <ChainOfThoughtTrigger
                leftIcon={
                  step >= 2 ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )
                }
              >
                Fetch + parse
              </ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <ChainOfThoughtItem className="flex items-center gap-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-14" />
                </ChainOfThoughtItem>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep defaultOpen>
              <ChainOfThoughtTrigger
                leftIcon={
                  step >= 3 ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )
                }
              >
                Chunk + index
              </ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <ChainOfThoughtItem className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </ChainOfThoughtItem>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep defaultOpen>
              <ChainOfThoughtTrigger
                leftIcon={
                  step >= 4 ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )
                }
              >
                Ready for chat
              </ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <ChainOfThoughtItem>
                  Almost done — enabling chat input…
                </ChainOfThoughtItem>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>
          </ChainOfThought>
        </div>
      </MessageContent>
    </Message>
  );
}


