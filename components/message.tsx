"use client";

import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import equal from "fast-deep-equal";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  LightbulbIcon, 
  BrainIcon, 
  ThumbsUp, 
  ThumbsDown 
} from "lucide-react";
import { SpinnerIcon } from "./icons";
import { ToolInvocation } from "./tool-invocation";
import { CopyButton } from "./copy-button";

// Helper function to remove context from display text
const cleanDisplayText = (text: string): string => {
  // Remove "Context: {json}\n\n" pattern from the beginning
  const contextPattern = /^Context:\s*\{[\s\S]*?\}\s*\n\n/;
  return text.replace(contextPattern, '');
};

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
  details: Array<{ type: "text"; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col mb-2 group">
      {isReasoning ? (
        <div className={cn(
          "flex items-center gap-2.5 rounded-full py-1.5 px-3",
          "bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300",
          "border border-indigo-200/50 dark:border-indigo-700/20 w-fit"
        )}>
          <div className="animate-spin h-3.5 w-3.5">
            <SpinnerIcon />
          </div>
          <div className="text-xs font-medium tracking-tight">Thinking...</div>
        </div>
      ) : (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center justify-between w-full",
            "rounded-md py-2 px-3 mb-0.5",
            "bg-muted/50 border border-border/60 hover:border-border/80",
            "transition-all duration-150 cursor-pointer",
            isExpanded ? "bg-muted border-primary/20" : ""
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full",
              "bg-amber-50 dark:bg-amber-900/20",
              "text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700/30",
            )}>
              <LightbulbIcon className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Reasoning
              <span className="text-xs text-muted-foreground font-normal">
                (click to {isExpanded ? "hide" : "view"})
              </span>
            </div>
          </div>
          <div className={cn(
            "flex items-center justify-center",
            "rounded-full p-0.5 w-5 h-5",
            "text-muted-foreground hover:text-foreground",
            "bg-background/80 border border-border/50",
            "transition-colors",
          )}>
            {isExpanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronUpIcon className="h-3 w-3" />
            )}
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className={cn(
              "text-sm text-muted-foreground flex flex-col gap-2",
              "pl-3.5 ml-0.5 mt-1",
              "border-l border-amber-200/50 dark:border-amber-700/30"
            )}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="text-xs text-muted-foreground/70 pl-1 font-medium">
              The assistant&apos;s thought process:
            </div>
            {part.details.map((detail, detailIndex) =>
              detail.type === "text" ? (
                <div key={detailIndex} className="px-2 py-1.5 bg-muted/10 rounded-md border border-border/30">
                  <Markdown>{detail.text}</Markdown>
                </div>
              ) : (
                "<redacted>"
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PurePreviewMessageProps {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  traceId?: string;
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  traceId,
}: PurePreviewMessageProps) => {
  const searchParams = useSearchParams();
  const hideTools = searchParams.get("hideTools") === "true";
  const hideReasoning = searchParams.get("hideReasoning") === "true";
  
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleFeedback = async (type: "up" | "down") => {
    const previousFeedback = feedback;
    const newValue = previousFeedback === type ? null : type;
    
    setFeedback(newValue);

    if (!traceId) {
      console.warn("No traceId available for feedback logging");
      return;
    }

    if (!newValue) return;

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trace_id: traceId,
          score: newValue === "up" ? 1 : 0,
          comment: newValue === "down" ? "User clicked Thumbs Down" : "User clicked Thumbs Up"
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback", error);
      setFeedback(previousFeedback);
    }
  };

  const getMessageText = () => {
    if (!message.parts) return "";
    return message.parts
      .filter(part => part.type === "text")
      .map(part => (part.type === "text" ? part.text : ""))
      .join("\n\n");
  };

  // Only show copy button if the message is from the assistant and not currently streaming
  const shouldShowCopyButton = message.role === "assistant" && (!isLatestMessage || status !== "streaming");

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className={cn(
          "w-full mx-auto px-1 xs:px-2 sm:px-4 group/message break-words overflow-x-auto",
          message.role === "assistant" ? "mb-4 xs:mb-6 sm:mb-8" : "mb-3 xs:mb-4 sm:mb-6"
        )}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-2 xs:gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit min-w-0 break-words overflow-x-auto",
          )}
        >
          <div className="flex flex-col w-full space-y-3 min-w-0">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-row gap-2 items-start w-full min-w-0"
                    >
                      <div
                        className={cn("flex flex-col gap-3 w-full min-w-0 break-words overflow-x-auto", {
                          "bg-secondary text-secondary-foreground px-2 xs:px-3 sm:px-4 py-2 xs:py-3 rounded-2xl":
                            message.role === "user",
                        })}
                      >
                        <Markdown 
                          messageId={message.id}
                          isEditable={message.role === "assistant"}
                        >
                          {message.role === "user" ? cleanDisplayText(part.text) : part.text}
                        </Markdown>
                      </div>
                    </motion.div>
                  );
                case "tool-invocation":
                  if (hideTools) return null;
                  
                  const { toolName, state, args } = part.toolInvocation;
                  const result = 'result' in part.toolInvocation ? part.toolInvocation.result : null;
                  
                  return (
                    <ToolInvocation
                      key={`message-${message.id}-part-${i}`}
                      toolName={toolName}
                      state={state}
                      args={args}
                      result={result}
                      isLatestMessage={isLatestMessage}
                      status={status}
                    />
                  );
                case "reasoning":
                  if (hideReasoning) return null;
                  
                  return (
                    <ReasoningMessagePart
                      key={`message-${message.id}-${i}`}
                      // @ts-expect-error part
                      part={part}
                      isReasoning={
                        (message.parts &&
                          status === "streaming" &&
                          i === message.parts.length - 1) ??
                        false
                      }
                    />
                  );
                default:
                  return null;
              }
            })}
            
            {shouldShowCopyButton && (
              <div className="flex items-center justify-start gap-2 mt-2">
                <CopyButton text={getMessageText()} />

                <div className="h-4 w-[1px] bg-border/60 mx-1" />

                <button
                  onClick={() => handleFeedback("up")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors hover:bg-muted",
                    feedback === "up" 
                      ? "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label="Thumbs up"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleFeedback("down")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors hover:bg-muted",
                    feedback === "down" 
                      ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label="Thumbs down"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.traceId !== nextProps.traceId) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations)
    return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});
