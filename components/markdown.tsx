/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useEditor } from "@/lib/context/editor-context";
import { PencilIcon } from "lucide-react";
import { CodeBlock } from "./code-block";

interface MarkdownProps {
  children: string;
  messageId?: string;
  isEditable?: boolean;
  onEdit?: (content: string) => void;
}

// No longer needed - edit button has been moved to the CodeBlock component

const components: Partial<Components> = {
  // Basic pre handler - code blocks are now handled by the code component directly
  pre: ({ node, className, children, ...props }) => {
    // We'll let the children render normally, as the code component will handle code blocks
    return (
      <pre className="my-0 overflow-visible" {...props}>
        {children}
      </pre>
    );
  },
  
  // Handle both inline code and code blocks
  code: ({ node, inline, className, children, ...props }: any) => {
    // Extract language from className for code blocks
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    // Handle inline code
    if (inline) {
      return (
        <code
          className="px-1 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/50 black:bg-zinc-800/50 dark-blue:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 black:text-zinc-300 dark-blue:text-zinc-300 text-[0.9em] font-mono break-all"
          {...props}
        >
          {children}
        </code>
      );
    }
    
    // Handle code blocks directly here
    const codeContent = typeof children === 'string' 
      ? children 
      : Array.isArray(children) 
        ? children.map(child => typeof child === 'string' ? child : '').join('') 
        : '';
    
    if (codeContent) {
      return <CodeBlock language={language}>{codeContent}</CodeBlock>;
    }
    
    // Fallback if we couldn't extract content
    return <code className={className} {...props}>{children}</code>;
  },
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-4 space-y-0.5 my-1.5" {...props}>
      {children}
    </ol>
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc list-outside ml-4 space-y-0.5 my-1.5" {...props}>
      {children}
    </ul>
  ),
  li: ({ node, children, ...props }) => (
    <li className="leading-normal" {...props}>
      {children}
    </li>
  ),
  p: ({ node, children, ...props }) => (
    <p className="leading-relaxed my-1 break-words overflow-x-auto" {...props}>
      {children}
    </p>
  ),
  strong: ({ node, children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ node, children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ node, children, ...props }) => (
    <blockquote
      className="border-l-2 border-zinc-200 dark:border-zinc-700 black:border-zinc-700 dark-blue:border-zinc-700 pl-3 my-1.5 italic text-zinc-600 dark:text-zinc-400 black:text-zinc-400 dark-blue:text-zinc-400"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ node, children, ...props }) => (
    // @ts-expect-error error
    <Link
      className="text-blue-500 hover:underline hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 black:text-blue-400 black:hover:text-blue-300 dark-blue:text-blue-400 dark-blue:hover:text-blue-300 transition-colors"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </Link>
  ),
  h1: ({ node, children, ...props }) => (
    <h1 className="text-2xl font-semibold mt-3 mb-1.5 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className="text-xl font-semibold mt-2.5 mb-1.5 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className="text-lg font-semibold mt-2 mb-1 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className="text-base font-semibold mt-2 mb-1 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className="text-xs font-semibold mt-2 mb-0.5 text-zinc-800 dark:text-zinc-200 black:text-zinc-200 dark-blue:text-zinc-200" {...props}>
      {children}
    </h6>
  ),
  table: ({ node, children, ...props }) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 black:divide-zinc-700 dark-blue:divide-zinc-700 ymax:divide-[oklch(0.25_0.08_195.00)]" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node, children, ...props }) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800/50 black:bg-zinc-800/50 dark-blue:bg-zinc-800/50 ymax:bg-[oklch(0.20_0.06_195.00)]" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ node, children, ...props }) => (
    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 black:divide-zinc-700 dark-blue:divide-zinc-700 ymax:divide-[oklch(0.25_0.08_195.00)] bg-white dark:bg-transparent black:bg-transparent dark-blue:bg-transparent ymax:bg-transparent" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ node, children, ...props }) => (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 black:hover:bg-zinc-800/30 dark-blue:hover:bg-zinc-800/30 ymax:hover:bg-[oklch(0.15_0.05_195.00)]" {...props}>
      {children}
    </tr>
  ),
  th: ({ node, children, ...props }) => (
    <th
      className="px-3 py-1.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 black:text-zinc-400 dark-blue:text-zinc-400 ymax:text-[oklch(0.75_0.02_200.00)] uppercase tracking-wider"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node, children, ...props }) => (
    <td className="px-3 py-1.5 text-sm ymax:text-[oklch(0.95_0.01_200.00)]" {...props}>
      {children}
    </td>
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700 black:border-zinc-700 dark-blue:border-zinc-700" {...props} />
  ),
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children, messageId, isEditable = false }: MarkdownProps) => {
  // Create a modified components object that includes the messageId
  const markdownComponents = {
    ...components,
    code: ({ node, inline, className, children, ...props }: any) => {
      // Extract language from className for code blocks
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      // Handle inline code
      if (inline) {
        return (
          <code
            className="px-1 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/50 black:bg-zinc-800/50 dark-blue:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 black:text-zinc-300 dark-blue:text-zinc-300 text-[0.9em] font-mono break-all"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // Handle code blocks directly here
      const codeContent = typeof children === 'string' 
        ? children 
        : Array.isArray(children) 
          ? children.map(child => typeof child === 'string' ? child : '').join('') 
          : '';
      
      if (codeContent) {
        return <CodeBlock 
          language={language} 
          messageId={isEditable ? messageId : undefined}
        >
          {codeContent}
        </CodeBlock>;
      }
      
      // Fallback if we couldn't extract content
      return <code className={className} {...props}>{children}</code>;
    }
  };
  
  return (
    <div className="relative w-full min-w-0 break-words overflow-x-auto">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.messageId === nextProps.messageId && 
    prevProps.isEditable === nextProps.isEditable
);