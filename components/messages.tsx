import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

interface MessagesProps {
  messages: TMessage[];
  isLoading: boolean;
  status: "streaming" | "error" | "submitted" | "ready";
  traceIds: Record<string, string>; // Add this prop
}

export function Messages({
  messages,
  isLoading,
  status,
  traceIds,
}: MessagesProps) {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div className="h-full overflow-y-auto no-scrollbar" ref={containerRef}>
      <div className="max-w-lg sm:max-w-3xl mx-auto py-2 xs:py-4 px-2 xs:px-4 sm:px-0">
        {messages.map((m, i) => {
          const messageTraceId = traceIds[m.id];
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
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
