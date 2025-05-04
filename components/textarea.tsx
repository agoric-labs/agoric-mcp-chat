import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2, Code2Icon } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { useEffect, useState } from "react";
import { CodeEditor } from "./code-editor";
import { AnimatePresence, motion } from "motion/react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
}

export const Textarea = ({
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
}: InputProps) => {
  const isStreaming = status === "streaming" || status === "submitted";
  const [showEditor, setShowEditor] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState("javascript");
  
  // Check if input contains the word "code"
  useEffect(() => {
    if (input.toLowerCase().includes("code")) {
      // We can attempt to detect the language as well
      const languageMatch = input.match(/code\s+(in\s+)?(\w+)/i);
      if (languageMatch && languageMatch[2]) {
        const detectedLang = languageMatch[2].toLowerCase();
        // Map common language names to Monaco editor language identifiers
        const langMap: Record<string, string> = {
          js: "javascript",
          javascript: "javascript",
          ts: "typescript",
          typescript: "typescript",
          python: "python",
          py: "python",
          java: "java",
          csharp: "csharp",
          cs: "csharp",
          cpp: "cpp",
          c: "c",
          ruby: "ruby",
          go: "go",
          rust: "rust",
          php: "php",
          html: "html",
          css: "css",
          json: "json",
          markdown: "markdown",
          md: "markdown",
          sql: "sql",
          shell: "shell",
          bash: "shell",
          sh: "shell",
        };
        
        setEditorLanguage(langMap[detectedLang] || "javascript");
      } else {
        // Default to JavaScript if no language specified
        setEditorLanguage("javascript");
      }
      
      // Automatically open the editor when "code" is detected
      if (!showEditor) {
        setShowEditor(true);
      }
    }
  }, [input, showEditor]);
  
  const handleEditorSubmit = (code: string) => {
    // Replace the "code" text with the code from the editor
    const formattedInput = input.replace(/code(\s+(in\s+)?\w+)?/i, code);
    
    // Create a synthetic change event
    const event = {
      target: { value: formattedInput },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    // Update the input
    handleInputChange(event);
    
    // Close the editor
    setShowEditor(false);
  };
  
  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };
  
  return (
    <div className="relative w-full">
      <AnimatePresence>
        {showEditor ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <CodeEditor
              language={editorLanguage}
              onClose={() => setShowEditor(false)}
              onSubmit={handleEditorSubmit}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      
      <ShadcnTextarea
        className="resize-none bg-background/50 dark:bg-muted/50 backdrop-blur-sm w-full rounded-2xl pr-12 pt-4 pb-16 border-input focus-visible:ring-ring placeholder:text-muted-foreground"
        value={input}
        autoFocus
        placeholder="Send a message..."
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isLoading && input.trim()) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <ModelPicker
        setSelectedModel={setSelectedModel}
        selectedModel={selectedModel}
      />
      
      <div className="flex items-center gap-2 absolute left-2 bottom-2">
        <button
          type="button"
          onClick={toggleEditor}
          disabled={isLoading}
          className="rounded-full p-2 bg-muted hover:bg-muted/90 text-muted-foreground hover:text-foreground transition-colors"
          title="Open code editor"
        >
          <Code2Icon className="h-4 w-4" />
        </button>
      </div>

      <button
        type={isStreaming ? "button" : "submit"}
        onClick={isStreaming ? stop : undefined}
        disabled={(!isStreaming && !input.trim()) || (isStreaming && status === "submitted")}
        className="absolute right-2 bottom-2 rounded-full p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200"
      >
        {isStreaming ? (
          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
        ) : (
          <ArrowUp className="h-4 w-4 text-primary-foreground" />
        )}
      </button>
    </div>
  );
};
