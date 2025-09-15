"use client";

import { useState, useEffect } from "react";

// Define the shape of the props this component expects
interface CodeEditorProps {
  file: { name: string; content: string; language?: string } | undefined;
  collaborators: Array<{
    id: number;
    name: string;
    cursor: { line: number; ch: number } | null;
  }>;
}

export default function CodeEditor({ file, collaborators }: CodeEditorProps) {
  // Use state to manage the code content
  const [code, setCode] = useState(file?.content || "");

  // Update the code in the editor when the file prop changes
  useEffect(() => {
    setCode(file?.content || "");
  }, [file]);

  // If no file is selected, show a message
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to begin editing.
      </div>
    );
  }

  // Split the code into lines to render them individually
  const lines = code.split("\n");

  return (
    <div className="flex-1 relative bg-zinc-900 text-white font-mono text-sm overflow-auto">
      <div className="p-4">
        {lines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className="flex items-center min-h-[20px] relative"
          >
            {/* Line number */}
            <div className="w-12 text-zinc-500 text-right pr-4 select-none">
              {lineIndex + 1}
            </div>
            <div className="flex-1 relative">
              {/* Line content */}
              <pre className="whitespace-pre-wrap">{line || " "}</pre>

              {/* Render collaborator cursors on the correct line */}
              {collaborators.map((collaborator) => {
                if (
                  collaborator.cursor &&
                  collaborator.cursor.line === lineIndex
                ) {
                  return (
                    <div
                      key={collaborator.id}
                      className="absolute top-0 w-0.5 h-5 bg-blue-500 animate-pulse"
                      style={{ left: `${collaborator.cursor.ch * 8}px` }} // Approximate character width
                    >
                      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                        {collaborator.name}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mock AI Suggestion Popup */}
      <div className="absolute bottom-4 right-4 bg-zinc-800 border border-zinc-700 rounded-lg p-3 max-w-xs shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-zinc-400">AI Suggestion</span>
        </div>
        <p className="text-xs text-zinc-300">
          Consider adding error handling for the API call on line 23
        </p>
        <div className="flex gap-2 mt-2">
          <button className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
            Apply
          </button>
          <button className="text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
