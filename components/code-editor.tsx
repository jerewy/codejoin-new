"use client";

import { useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { ProjectNodeFromDB } from "@/lib/types";
import emmetHTML from "monaco-emmet";

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
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // === 1. DEFINE A CUSTOM THEME ===
    monaco.editor.defineTheme("monokai", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "66747B" },
        { token: "string", foreground: "E6DB74" },
        { token: "keyword", foreground: "F92672" },
        { token: "number", foreground: "AE81FF" },
        { token: "operator", foreground: "F92672" },
        { token: "identifier", foreground: "A6E22E" },
        { token: "type", foreground: "66D9EF" },
        { token: "tag", foreground: "F92672" },
        { token: "attribute.name", foreground: "A6E22E" },
        { token: "attribute.value", foreground: "E6DB74" },
      ],
      colors: {
        "editor.background": "#272822",
        "editor.foreground": "#F8F8F2",
        "editorCursor.foreground": "#F8F8F0",
        "editor.lineHighlightBackground": "#3E3D32",
        "editor.selectionBackground": "#56554B",
      },
    });

    // === 2. CONFIGURE JAVASCRIPT/TYPESCRIPT LANGUAGE FEATURES ===
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      // Use modern JavaScript features
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      // Enable JSX support
      jsx: monaco.languages.typescript.JsxEmit.React,
    });

    // === CONFIGURE HTML LANGUAGE FEATURES ===

    // Safely get the existing format options, or use an empty object as a fallback.
    const existingFormatOptions =
      monaco.languages.html.htmlDefaults.options.format ?? {};

    monaco.languages.html.htmlDefaults.setOptions({
      ...monaco.languages.html.htmlDefaults.options,
      suggest: {
        ...monaco.languages.html.htmlDefaults.options.suggest,
        attributes: true,
        tags: true,
        values: true,
      },
      format: {
        // Start with all existing format options (or an empty object)
        ...(monaco.languages.html.htmlDefaults.options.format ?? {}),

        // Your desired changes
        indentInnerHtml: true,
        wrapLineLength: 120,

        // Complete set of required properties with safe defaults
        tabSize: 2,
        insertSpaces: true,
        unformatted: "",
        preserveNewLines: true,
        contentUnformatted: "",
        maxPreserveNewLines: 2, // This one is optional, but it's good practice to keep our default
        indentHandlebars: false,
        endWithNewline: false,
        extraLiners: "",
        wrapAttributes: "auto",
      },
    });

    // Enable syntax and semantic validation
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Example: Add type definitions for a custom global library
    // This provides Intellisense for objects that aren't defined in the file.
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `declare var myCustomGlobal: {
        version: string;
        log: (message: string) => void;
       };`,
      "myCustomGlobal.d.ts"
    );

    // === 3. ADD CUSTOM KEYBINDINGS ===
    // Keybinding for Save (Ctrl/Cmd + S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Keybinding for Format Document (Alt + Shift + F)
    editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        editor.getAction("editor.action.formatDocument")?.run();
      }
    );
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
      // Use our new custom theme!
      theme="vs-dark"
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: "off",
        padding: {
          top: 16,
        },
        glyphMargin: false,
        lineNumbersMinChars: 3,
        // Enable suggest-as-you-type and quick suggestions
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
      }}
    />
  );
}
