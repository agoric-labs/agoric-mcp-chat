"use client";

import { useEditor } from "@/lib/context/editor-context";
import { CodeEditor } from "./code-editor";
import { useCallback, useContext } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

// This component is a floating editor that appears when the user wants to edit markdown
export function FloatingEditor() {
  const { 
    isEditorOpen, 
    closeEditor, 
    editorContent, 
    editorLanguage, 
    currentMessageId, 
    updateContent,
    setSubmittedCode
  } = useEditor();
  
  const params = useParams();
  const chatId = params?.id as string | undefined;
  
  // Handle editor close without saving
  const handleClose = useCallback(() => {
    closeEditor();
  }, [closeEditor]);
  
  // Handle editor submit - now uses context state
  const handleSubmit = useCallback((code: string) => {
    // Show an alert notification when code is submitted
    alert("Code Submitted");
    
    // Format the code with proper markdown
    const formattedCode = `\`\`\`${editorLanguage}\n${code}\n\`\`\``;
    
    console.log("EDITOR: Submitting code to context:", formattedCode);
    
    // Store the formatted code in context for submission
    setSubmittedCode(formattedCode);
    
    // Show a toast notification
    toast.success("Message sent to chat", {
      position: "top-center",
      duration: 2000,
    });
    
    // Close the editor
    closeEditor();
  }, [closeEditor, setSubmittedCode, editorLanguage]);
  
  return (
    <Sheet open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <SheetContent className={cn(
        "sm:max-w-2xl w-full",
        "p-0 pt-6 overflow-hidden flex flex-col"
      )}>
        <SheetHeader className="px-4 mb-2">
          <SheetTitle>Edit Code</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <CodeEditor
            defaultValue={editorContent}
            language={editorLanguage}
            height="calc(100vh - 120px)"
            onClose={handleClose}
            onSubmit={handleSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}