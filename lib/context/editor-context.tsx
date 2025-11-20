'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

interface EditorContextType {
  isEditorOpen: boolean;
  openEditor: (content: string, language: string, messageId: string) => void;
  closeEditor: () => void;
  updateContent: (content: string) => void;
  editorContent: string;
  editorLanguage: string;
  currentMessageId: string | null;

  // Store the code for submission rather than callbacks
  setSubmittedCode: (code: string) => void;
  submittedCode: string | null;
  submissionKey: number; // Add a key to force React to detect changes
  clearSubmittedCode: () => void; // Function to clear the submitted code after processing
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('markdown');
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  // Store the submitted code rather than callbacks
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submissionKey, setSubmissionKey] = useState<number>(0);

  // Function to open the editor
  const openEditor = (
    content: string,
    language: string = 'javascript',
    messageId: string,
  ) => {
    setEditorContent(content);
    setEditorLanguage(language);
    setCurrentMessageId(messageId);
    setIsEditorOpen(true);
    // Reset submitted code when opening editor
    setSubmittedCode(null);
  };

  // Function to close the editor
  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentMessageId(null);
  };

  // Function to update the editor content
  const updateContent = (content: string) => {
    setEditorContent(content);
  };

  // Debug when the submitted code changes
  useEffect(() => {
    console.log('CONTEXT: submittedCode changed:', submittedCode);
  }, [submittedCode]);

  // Create wrapper for setSubmittedCode that also updates submissionKey
  const setSubmittedCodeWithKey = (code: string) => {
    // Set the submitted code only if it's different from the current value
    // This prevents submission loops
    if (code !== submittedCode) {
      console.log(
        'CONTEXT: Setting submitted code, was different from current value',
      );
      setSubmittedCode(code);
      setSubmissionKey(prevKey => prevKey + 1);
    } else {
      console.log(
        'CONTEXT: Ignoring identical code submission to prevent loops',
      );
    }
  };

  // Function to clear submitted code
  const clearSubmittedCode = useCallback(() => {
    console.log('CONTEXT: Clearing submitted code after processing');
    setSubmittedCode(null);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        isEditorOpen,
        openEditor,
        closeEditor,
        updateContent,
        editorContent,
        editorLanguage,
        currentMessageId,
        submittedCode,
        setSubmittedCode: setSubmittedCodeWithKey,
        submissionKey,
        clearSubmittedCode,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
