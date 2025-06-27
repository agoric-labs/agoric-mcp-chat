"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { Message, useChat } from "@ai-sdk/react";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getUserId } from "@/lib/user-id";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { convertToUIMessages } from "@/lib/chat-store";
import { type Message as DBMessage } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
import VerticalTextCarousel from "@/components/ui/carousel";
import { EditorProvider, useEditor } from "@/lib/context/editor-context";
import { FloatingEditor } from "./floating-editor";

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
  const contextParam = searchParams.get('context');
  const queryClient = useQueryClient();
  
  const [selectedModel, setSelectedModel] = useLocalStorage<modelID>("selectedModel", defaultModel);
  const [userId, setUserId] = useState<string>('');
  const [generatedChatId, setGeneratedChatId] = useState<string>('');
  
  // Get MCP server data from context
  const { mcpServersForApi } = useMCP();
  
  // Get the editor context
  const { submittedCode, editorLanguage, submissionKey, clearSubmittedCode } = useEditor();
  
  // Initialize userId
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  
  // Add event listener for code submissions
  useEffect(() => {
    const handleCodeSubmission = (event: any) => {
      console.log("Code submission detected in chat:", event.detail);
      // Here you could perform additional actions when code is submitted
    };
    
    // Add event listener
    window.addEventListener('code-submitted', handleCodeSubmission);
    
    // Cleanup
    return () => {
      window.removeEventListener('code-submitted', handleCodeSubmission);
    };
  }, []);
  
  // Generate a chat ID if needed
  useEffect(() => {
    if (!chatId) {
      setGeneratedChatId(nanoid());
    }
  }, [chatId]);
  
  

  const { messages, input, handleInputChange, handleSubmit, append, status, stop } =
    useChat({
      id: chatId || generatedChatId, // Use generated ID if no chatId in URL
      maxSteps: 20,
      body: {
        selectedModel,
        mcpServers: mcpServersForApi,
        chatId: chatId || generatedChatId, // Use generated ID if no chatId in URL
        userId,
      },
      experimental_throttle: 500,
      onFinish: () => {
        // Invalidate the chats query to refresh the sidebar
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['chats', userId] });
        }
      },
      onError: (error) => {
        toast.error(
          error.message.length > 0
            ? error.message
            : "An error occured, please try again later.",
          { position: "top-center", richColors: true },
        );
      },
    });
    
  // Define loading state early so it can be used in effects
  const isLoading = status === "streaming" || status === "submitted";
  
  // Custom submit handler - Define this BEFORE using it in the effect
  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if this is the first message and we have context to prepend
    const isFirstMessage = messages.length === 0;
    const shouldPrependContext = isFirstMessage && contextParam && input.trim();
    
    if (shouldPrependContext) {
      try {
        const parsedContext = JSON.parse(decodeURIComponent(contextParam));
        const contextString = JSON.stringify(parsedContext);
        const messageWithContext = `Context: ${contextString}\n\n${input}`;
        
        // Use append to send the message with context without modifying the input field
        append({
          role: 'user',
          content: messageWithContext
        });
        
        // Clear the input field
        handleInputChange({ target: { value: '' } } as any);
      } catch (error) {
        console.error('Failed to parse context parameter:', error);
        handleSubmit(e);
      }
    } else {
      handleSubmit(e);
    }
    
    if (!chatId && generatedChatId && input.trim()) {
      // If this is a new conversation, redirect to the chat page with the generated ID
      const effectiveChatId = generatedChatId;
      
      // Preserve context parameter in navigation
      const contextQuery = contextParam ? `?context=${encodeURIComponent(contextParam)}` : '';
      router.push(`/chat/${effectiveChatId}${contextQuery}`);
    }
  }, [chatId, generatedChatId, input, handleSubmit, handleInputChange, append, router, contextParam, messages.length]);
    
  // Track previous submission to prevent loops
  const [lastSubmittedKey, setLastSubmittedKey] = useState<number>(0);
  
  // Listen for submitted code and send it to the chat
  useEffect(() => {
    console.log("CHAT: submittedCode changed:", submittedCode, "key:", submissionKey, "lastKey:", lastSubmittedKey);
    
    // Only proceed if:
    // 1. There's submitted code
    // 2. Valid submission key that's different from the last one we processed
    // 3. Not already loading
    if (submittedCode && submissionKey > 0 && submissionKey !== lastSubmittedKey && !isLoading) {
      console.log("CHAT: Preparing to submit code to chat, key changed:", submissionKey, "from:", lastSubmittedKey);
      
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
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>;
        
        console.log("CHAT: Submitting form with handleFormSubmit");
        handleFormSubmit(formEvent);
        
        // Clear the submitted code to prevent resubmission
        clearSubmittedCode();
      }, 100);
    }
  }, [submittedCode, submissionKey, lastSubmittedKey, isLoading, handleInputChange, handleFormSubmit, clearSubmittedCode]);

  return (
    <div className="h-dvh flex flex-col justify-center w-full max-w-3xl mx-auto px-4 sm:px-6 md:py-4">
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview />
          <form
            onSubmit={handleFormSubmit}
            className="mt-4 w-full mx-auto"
          >
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={status}
              stop={stop}
            />
          </form>
          {/* Only show carousel when no messages exist */}
          <VerticalTextCarousel/>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <Messages messages={messages} isLoading={isLoading} status={status} />
          </div>
          <form
            onSubmit={handleFormSubmit}
            className="mt-2 w-full mx-auto mb-4 sm:mb-auto"
          >
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={status}
              stop={stop}
            />
          </form>
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
