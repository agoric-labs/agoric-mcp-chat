import type { UIMessage as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { SpinnerIcon } from "./icons";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface MessagesProps {
  messages: TMessage[];
  isLoading: boolean;
  status: "streaming" | "error" | "submitted" | "ready";
  traceIds: Record<string, string>; 
}

export const Messages = ({
  messages,
  isLoading,
  status,
  traceIds,
}: MessagesProps) => {
  const [containerRef, endRef] = useScrollToBottom();
  
  // Debug: Monitor traceIds updates
  useEffect(() => {
    if (Object.keys(traceIds).length > 0) {
      console.log("Messages Component - Available Trace IDs:", traceIds);
    }
  }, [traceIds]);

  // Check if we're waiting for the first response
  const isWaitingForResponse = (status === "submitted" || status === "streaming") && 
    messages.length > 0 && 
    messages.at(-1)?.role === "user";
  
  return (
    <div
      className="h-full overflow-y-auto no-scrollbar"
      ref={containerRef}
    >
      <div className="max-w-lg sm:max-w-3xl mx-auto py-2 xs:py-4 px-2 xs:px-4 sm:px-0">
        {messages.map((m, i) => {
          // Look up the trace ID for this specific message
          const messageTraceId = traceIds[m.id];
          
          if (m.role === 'assistant' && !messageTraceId && status !== 'streaming') {
             console.warn(`Trace ID missing for message: ${m.id}`);
          }

          return (
            <Message
              key={m.id}
              isLatestMessage={i === messages.length - 1}
              isLoading={isLoading}
              message={m}
              status={status}
              traceId={messageTraceId}
            />
          );
        })}
        
        {/* Show thinking indicator when waiting for assistant response */}
        {isWaitingForResponse && (
          <div className="w-full mx-auto px-1 xs:px-2 sm:px-4 mb-4">
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
          </div>
        )}
        
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
