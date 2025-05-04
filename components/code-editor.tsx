"use client";

import { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { XIcon, CheckIcon, MoonIcon, SunIcon, MonitorIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface CodeEditorProps {
  defaultValue?: string;
  language?: string;
  height?: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
}

const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "html",
  "css",
  "json",
  "python",
  "java",
  "csharp",
  "cpp",
  "ruby",
  "go",
  "rust",
  "php",
  "shell",
  "sql",
  "markdown",
  "yaml",
  "xml",
];

export function CodeEditor({
  defaultValue = "",
  language = "javascript",
  height = "300px",
  onClose,
  onSubmit,
}: CodeEditorProps) {
  const [code, setCode] = useState(defaultValue);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const editorRef = useRef<any>(null);
  const { theme, setTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  // Set editor theme based on the current app theme
  useEffect(() => {
    if (theme === "dark") {
      setEditorTheme("vs-dark");
    } else if (theme === "light") {
      setEditorTheme("vs");
    } else {
      // Handle system theme dynamically
      const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setEditorTheme(isDarkMode ? "vs-dark" : "vs");
    }
  }, [theme]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Focus editor when mounted
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };
  
  // Custom function to handle code submission
  const handleCodeSubmit = () => {
    // Log to console
    console.log("Code submitted:", code);
    
    // Dispatch a custom event that can be listened to externally
    const submitEvent = new CustomEvent('code-submitted', { 
      detail: { code, language: selectedLanguage } 
    });
    window.dispatchEvent(submitEvent);
    
    // Call the onSubmit handler passed from parent
    onSubmit(code);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  const toggleTheme = (mode: "light" | "dark" | "system") => {
    setTheme(mode);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Code Editor</div>
          <select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="text-xs bg-muted border border-border rounded-md px-2 py-1"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 mr-2 border border-border rounded-md overflow-hidden">
            <button
              onClick={() => toggleTheme("light")}
              className={cn(
                "p-1.5 flex items-center justify-center",
                theme === "light" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
              )}
              title="Light theme"
            >
              <SunIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => toggleTheme("dark")}
              className={cn(
                "p-1.5 flex items-center justify-center",
                theme === "dark" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
              )}
              title="Dark theme"
            >
              <MoonIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => toggleTheme("system")}
              className={cn(
                "p-1.5 flex items-center justify-center",
                theme === "system" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
              )}
              title="System theme"
            >
              <MonitorIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={handleCodeSubmit}
            className={cn(
              "flex items-center justify-center",
              "rounded-full p-1.5",
              "bg-green-500/10 text-green-500 hover:bg-green-500/20",
              "transition-colors"
            )}
            title="Submit code"
            data-test-id="submit-code-button"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className={cn(
              "flex items-center justify-center",
              "rounded-full p-1.5",
              "bg-red-500/10 text-red-500 hover:bg-red-500/20",
              "transition-colors"
            )}
            title="Close editor"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Editor
          height={height}
          language={selectedLanguage}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            automaticLayout: true,
            lineNumbers: "on",
            tabSize: 2,
            fontFamily: "monospace",
            folding: true,
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
          }}
          theme={editorTheme}
        />
      </div>
    </div>
  );
}