"use client";

import { useState, useEffect } from "react";

// Define the shape of the props this component expects
interface CodeEditorProps {
  file:
    | {
        id?: string;
        name: string;
        content: string | null;
        language?: string | null;
      }
    | undefined;
  collaborators: Array<{
    id: number;
    name: string;
    cursor: { line: number; ch: number } | null;
  }>;
  onChange?: (newContent: string) => void;
  onSave?: () => void;
}

export default function CodeEditor({
  file,
  collaborators,
  onChange,
  onSave,
}: CodeEditorProps) {
  // Use state to manage the code content
  const [code, setCode] = useState(file?.content ?? "");

  // Update the code in the editor when the file prop changes
  useEffect(() => {
    setCode(file?.content ?? "");
  }, [file]);

  // propagate changes
  useEffect(() => {
    onChange?.(code);
  }, [code]);

  // Ctrl+S handler delegates to onSave
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  // If no file is selected, show a message
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to begin editing.
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-zinc-900 text-white font-mono text-sm overflow-auto">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-full p-4 bg-transparent outline-none resize-none"
        spellCheck={false}
      />

      {/* Mock collaborator cursors container retained for now */}
      <div className="hidden">{collaborators.length}</div>
    </div>
  );
}
