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
import { CheckCircle2, FileSearch, Loader2, XCircle } from "lucide-react";
import type { ProjectStatus } from "@/lib/projects-api";

export type LinkProcessingPanelProps = {
  step: number; // 0..5, -1 for failed
  url: string;
  status?: ProjectStatus;
};

const STEPS = [
  { key: "pending", label: "Creating job", description: "Validating URL and initializing job..." },
  { key: "scraping", label: "Scraping page", description: "Extracting annual report links from BSE India..." },
  { key: "downloading", label: "Downloading PDF", description: "Fetching the annual report PDF file..." },
  { key: "parsing", label: "Parsing document", description: "Extracting text and structure from PDF..." },
  { key: "embedding", label: "Indexing content", description: "Creating embeddings and indexing for RAG..." },
];

function StepIcon({ stepIndex, currentStep }: { stepIndex: number; currentStep: number }) {
  if (currentStep === -1) {
    return <XCircle className="size-4 text-destructive" />;
  }
  if (stepIndex < currentStep) {
    return <CheckCircle2 className="size-4 text-primary" />;
  }
  if (stepIndex === currentStep) {
    return <Loader2 className="size-4 animate-spin text-primary" />;
  }
  return <div className="size-4 rounded-full border-2 border-muted-foreground/30" />;
}

export function LinkProcessingPanel({ step, url, status }: LinkProcessingPanelProps) {
  const isFailed = step === -1 || status === "failed";
  const isComplete = step >= 5 || status === "completed" || status === "ready";

  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col items-start gap-2 px-6">
      <MessageContent className="w-full bg-transparent p-0">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileSearch className="size-4 text-primary" />
            <div className="text-sm font-medium">
              {isFailed
                ? "Processing failed"
                : isComplete
                  ? "Processing complete"
                  : "Analyzing annual report"}
            </div>
          </div>

          <div className="text-muted-foreground mb-4 truncate text-xs">{url}</div>

          <ChainOfThought>
            {STEPS.map((s, i) => (
              <ChainOfThoughtStep key={s.key} defaultOpen>
                <ChainOfThoughtTrigger
                  leftIcon={<StepIcon stepIndex={i} currentStep={step} />}
                  className={cn(
                    i < step && "text-foreground",
                    i === step && "text-foreground font-medium",
                    i > step && "text-muted-foreground"
                  )}
                  children={s.label}
                />
                <ChainOfThoughtContent>
                  <ChainOfThoughtItem
                    className={cn(
                      "text-xs",
                      i === step && "text-muted-foreground"
                    )}
                  >
                    {i === step ? (
                      <div className="flex flex-col gap-2">
                        <span>{s.description}</span>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                      </div>
                    ) : i < step ? (
                      <span className="text-muted-foreground">Completed</span>
                    ) : (
                      <span className="text-muted-foreground/60">Waiting...</span>
                    )}
                  </ChainOfThoughtItem>
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            ))}

            <ChainOfThoughtStep defaultOpen>
              <ChainOfThoughtTrigger
                leftIcon={
                  isComplete ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : isFailed ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : (
                    <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                  )
                }
                className={cn(
                  isComplete && "text-foreground font-medium",
                  !isComplete && !isFailed && "text-muted-foreground"
                )}
              >
                <>{isFailed ? "Failed" : "Ready for chat"}</>
              </ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <ChainOfThoughtItem className="text-xs">
                  {isComplete ? (
                    <span className="text-primary">
                      Analysis complete! You can now ask questions about the annual report.
                    </span>
                  ) : isFailed ? (
                    <span className="text-destructive">
                      An error occurred during processing. Please try again.
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">
                      Almost there — enabling chat input…
                    </span>
                  )}
                </ChainOfThoughtItem>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>
          </ChainOfThought>
        </div>
      </MessageContent>
    </Message>
  );
}
