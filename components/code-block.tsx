"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUpIcon, ChevronDownIcon, CopyIcon, CheckIcon, CodeIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/hooks/use-copy";
import { useEditor } from "@/lib/context/editor-context";

interface CodeBlockProps {
  children: string;
  language: string;
  className?: string;
  messageId?: string;
}

export function CodeBlock({ children, language, className, messageId }: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!language);
  const { copy, isCopied } = useCopy();
  const { openEditor } = useEditor();

  const handleCopy = () => {
    copy(children);
  };
  
  const handleEdit = () => {
    if (messageId) {
      openEditor(children, language || "javascript", messageId);
    }
  };

  // Calculate preview - first line or first 50 chars
  const previewText = children && typeof children === 'string' 
    ? (children.split('\n')[0].slice(0, 50) + (children.split('\n')[0].length > 50 ? '...' : '')) 
    : 'Code snippet';
  
  // Calculate number of lines
  const lineCount = children && typeof children === 'string' 
    ? children.split('\n').length 
    : 1;

  return (
    <div className={cn(
      "rounded-lg overflow-hidden border border-border/70 my-3 w-full",
      className
    )}>
      {/* Header */}
      {language && (
        <div 
          className={cn(
            "flex items-center justify-between w-full",
            "py-2 px-3",
            "bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 dark:hover:bg-muted/60",
            "transition-colors cursor-pointer",
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <CodeIcon className="w-4 h-4 text-muted-foreground" />
            <div className="text-xs font-medium text-muted-foreground">
              {language && (
                <span className="uppercase">Orchestration Workflow</span>
              )}
              <span className="ml-2 bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground text-[10px]">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Copy button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className={cn(
                "p-1 rounded-md",
                "hover:bg-muted-foreground/10 transition-colors",
                "text-muted-foreground",
              )}
              title="Copy code"
            >
              {isCopied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </button>
            
            {/* Edit button - only shown if messageId is provided */}
            {messageId && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                className={cn(
                  "p-1 rounded-md",
                  "hover:bg-muted-foreground/10 transition-colors",
                  "text-muted-foreground",
                )}
                title="Edit in code editor"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            )}
            
            {/* Expand/collapse toggle */}
            <div className={cn(
              "flex items-center justify-center",
              "rounded-full p-0.5 w-5 h-5",
              "text-muted-foreground hover:text-foreground",
              "bg-background/80 border border-border/50",
              "transition-colors ml-1",
            )}>
              {isExpanded ? (
                <ChevronDownIcon className="h-3 w-3" />
              ) : (
                <ChevronUpIcon className="h-3 w-3" />
              )}
            </div>
          </div>
        </div>
      )}
      <AnimatePresence initial={false} mode="wait">
        {!isExpanded ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-hidden text-ellipsis whitespace-nowrap"
          >
          </motion.div>
        ) : (
          <motion.div
            key="code-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <pre className="overflow-x-auto bg-zinc-100 dark:bg-zinc-800/50 p-3 text-sm">
              <code className="font-mono text-zinc-700 dark:text-zinc-300">
                {children}
              </code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}