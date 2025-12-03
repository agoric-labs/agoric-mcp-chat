"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getUserId } from "@/lib/user-id";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS, TokenWarningLevel } from "@/lib/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { convertToUIMessages } from "@/lib/chat-store";
import { type Message as DBMessage } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
// import VerticalTextCarousel from "@/components/ui/carousel";
import { EditorProvider, useEditor } from "@/lib/context/editor-context";
import { FloatingEditor } from "./floating-editor";
import { useTokenCounter } from "@/lib/hooks/use-token-counter";
import { ContextWarningBanner } from "./context-warning-banner";
import { useTokenTracking } from "@/lib/hooks/use-token-tracking";

// Type for chat data from DB
interface ChatData {
  id: string;
  messages: DBMessage[];
  createdAt: string;
  updatedAt: string;
}

// Inner chat component that consumes the EditorContext
function ChatContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params?.id as string | undefined;
  const contextParam = searchParams.get("context");
  const titleParam = searchParams.get("title");
  const disableAutoFocus = !!searchParams.get("disableAutoFocus");
  const title = titleParam ? decodeURIComponent(titleParam) : "Agoric AI Chat";
  const queryClient = useQueryClient();

  const [selectedModel, setSelectedModel] = useLocalStorage<modelID>(
    "selectedModel",
    defaultModel,
  );
  const [userId, setUserId] = useState<string>(getUserId());
  const [generatedChatId, setGeneratedChatId] = useState<string>("");

  // Get MCP server data from context
  const { mcpServersForApi } = useMCP();

  // Get the editor context
  const { submittedCode, editorLanguage, submissionKey, clearSubmittedCode } =
    useEditor();

  // Add event listener for code submissions
  useEffect(() => {
    const handleCodeSubmission = (event: any) => {
      console.log("Code submission detected in chat:", event.detail);
      // Here you could perform additional actions when code is submitted
    };

    // Add event listener
    window.addEventListener("code-submitted", handleCodeSubmission);

    // Cleanup
    return () => {
      window.removeEventListener("code-submitted", handleCodeSubmission);
    };
  }, []);

  // Generate a chat ID if needed
  useEffect(() => {
    if (!chatId) {
      setGeneratedChatId(nanoid());
    }
  }, [chatId]);

  // Safely access window only on client side
  const newParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  if (contextParam) newParams.set("context", contextParam);

  // Check params to determine which API to use
  const useAgoricWebsiteMCP = searchParams.get("useAgoricWebsiteMCP");
  const theme = searchParams.get("theme");

  let apiBase = "/api/chat"; // default
  if (useAgoricWebsiteMCP) {
    apiBase = "/api/support";
  } else if (theme === "ymax") {
    apiBase = "/api/ymax";
  }

  const apiUrl = newParams.toString()
    ? `${apiBase}?${newParams.toString()}`
    : apiBase;

  // Manage input state manually in v5
  const [input, setInput] = useState("");

  const { tokenUsage, createTokenTrackingTransport } = useTokenTracking();

  const {
    messages,
    sendMessage,
    status,
    stop,
  } = useChat({
    id: chatId || generatedChatId, // Use generated ID if no chatId in URL
    transport: createTokenTrackingTransport({
      api: apiUrl,
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            selectedModel,
            mcpServers: mcpServersForApi,
            chatId: chatId || generatedChatId,
            userId,
          },
        };
      },
    }),
    experimental_throttle: 50, // Lower throttle for smoother streaming (50ms)
    onFinish: () => {
      // Invalidate the chats query to refresh the sidebar
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["chats", userId] });
      }
    },
    onError: (error) => {
      console.error("CHAT: onError", error);
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occured, please try again later.",
        { position: "top-center", richColors: true },
      );
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const tokenCounter = useTokenCounter(selectedModel, tokenUsage);
  const isContextFull = tokenCounter.warningLevel === TokenWarningLevel.BLOCKED;

  // Custom submit handler - Define this BEFORE using it in the effect
  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input.trim()) return;

      sendMessage({ text: input });
      setInput('');

      // If this is a new conversation, update the URL without causing a remount
      if (!chatId && generatedChatId) {
        // Preserve all query parameters in navigation
        const searchParams = new URLSearchParams(window.location.search);
        const queryString = searchParams.toString();
        const queryQuery = queryString ? `?${queryString}` : "";
        window.history.replaceState({}, '', `/chat/${generatedChatId}${queryQuery}`);
      }
    },
    [chatId, generatedChatId, input, sendMessage],
  );

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Track previous submission to prevent loops
  const [lastSubmittedKey, setLastSubmittedKey] = useState<number>(0);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const data =
        typeof e.data === "string"
          ? (() => {
            try {
              return JSON.parse(e.data);
            } catch {
              return e.data;
            }
          })()
          : e.data;

      if (data?.type === "ORBIT_CHAT/SET_AND_SUBMIT") {
        const text = data?.payload?.input ?? "";
        if (text) {
          sendMessage({ text });
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Listen for submitted code and send it to the chat
  useEffect(() => {
    console.log(
      "CHAT: submittedCode changed:",
      submittedCode,
      "key:",
      submissionKey,
      "lastKey:",
      lastSubmittedKey,
    );

    // Only proceed if:
    // 1. There's submitted code
    // 2. Valid submission key that's different from the last one we processed
    // 3. Not already loading
    if (
      submittedCode &&
      submissionKey > 0 &&
      submissionKey !== lastSubmittedKey &&
      !isLoading
    ) {
      console.log(
        "CHAT: Preparing to submit code to chat, key changed:",
        submissionKey,
        "from:",
        lastSubmittedKey,
      );

      // Update last submitted key to prevent reprocessing
      setLastSubmittedKey(submissionKey);

      // Set the input value to the submitted code
      const inputEvent = {
        target: { value: submittedCode },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      console.log("CHAT: Setting input value:", submittedCode);
      handleInputChange(inputEvent);

      // Use a timeout to ensure the input is set before submitting
      setTimeout(() => {
        // Create a synthetic form event
        const formEvent = {
          preventDefault: () => { },
        } as React.FormEvent<HTMLFormElement>;

        console.log("CHAT: Submitting form with handleFormSubmit");
        handleFormSubmit(formEvent);

        // Clear the submitted code to prevent resubmission
        clearSubmittedCode();
      }, 100);
    }
  }, [
    submittedCode,
    submissionKey,
    lastSubmittedKey,
    isLoading,
    handleInputChange,
    handleFormSubmit,
    clearSubmittedCode,
  ]);

  return (
    <div className="h-dvh flex flex-col justify-center w-full max-w-3xl mx-auto px-2 xs:px-4 sm:px-6 py-2 xs:py-4 md:py-4 min-w-0">
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview heading={title} />
          <form onSubmit={handleFormSubmit} className="mt-4 w-full mx-auto">
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={status}
              stop={stop}
              autoFocus={!disableAutoFocus}
              messages={messages}
              tokenCounter={tokenCounter}
              isContextFull={isContextFull}
            />
          </form>
          {/* Only show carousel when no messages exist */}
          {/* <VerticalTextCarousel/> */}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <Messages
              messages={messages}
              isLoading={isLoading}
              status={status}
            />
          </div>
          <div className="w-full mx-auto px-2 xs:px-0">
            {/* Context Warning Banner */}
            <ContextWarningBanner
              warningLevel={tokenCounter.warningLevel}
              usagePercent={tokenCounter.usagePercent}
            />
            <form
              onSubmit={handleFormSubmit}
              className="mt-2 mb-2 xs:mb-4 sm:mb-auto"
            >
              <Textarea
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                handleInputChange={handleInputChange}
                input={input}
                isLoading={isLoading}
                status={status}
                stop={stop}
                autoFocus={!disableAutoFocus}
                messages={messages}
                tokenCounter={tokenCounter}
                isContextFull={isContextFull}
              />
            </form>
          </div>
        </>
      )}

      {/* Floating editor for markdown editing */}
      <FloatingEditor />
    </div>
  );
}

// Main export that wraps the chat content with the editor provider
export default function Chat() {
  return (
    <EditorProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <ChatContent />
      </Suspense>
    </EditorProvider>
  );
}
