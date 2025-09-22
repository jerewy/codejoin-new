"use client";

import { useState, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { ProjectNodeFromDB } from "@/lib/types";

// Define the shape of the props this component expects
interface CodeEditorProps {
  file: ProjectNodeFromDB | undefined;
  onChange: (value: string | undefined) => void;
  onSave: () => void;
}

export default function CodeEditor({
  file,
  onChange,
  onSave,
}: CodeEditorProps) {
  // All the useState and useEffect hooks for code have been removed.

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to begin editing.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={file.language || file.name.split(".").pop() || "plaintext"}
      value={file.content || ""}
      theme="vs-dark"
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: "on",
        // --- ADD THESE OPTIONS TO FIX THE PADDING ---
        padding: {
          top: 16, // Add 1rem of padding to the top
        },
        glyphMargin: false, // Removes the space on the far left
        lineNumbersMinChars: 3, // Reduces space reserved for line numbers
      }}
    />
  );
}
