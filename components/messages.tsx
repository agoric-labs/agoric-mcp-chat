import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { SpinnerIcon } from "./icons";
import { cn } from "@/lib/utils";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  
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
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        
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
