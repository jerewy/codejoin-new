"use client";

import { useCallback, useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { ProjectNodeFromDB } from "@/lib/types";
import type * as MonacoEditor from "monaco-editor";

// Enhanced language support with more comprehensive file extensions
const SUPPORTED_LANGUAGES = [
  { id: "javascript", name: "JavaScript", ext: ["js", "mjs", "jsx"] },
  { id: "typescript", name: "TypeScript", ext: ["ts", "tsx"] },
  { id: "python", name: "Python", ext: ["py", "pyw", "pyi"] },
  { id: "html", name: "HTML", ext: ["html", "htm", "xhtml"] },
  { id: "css", name: "CSS", ext: ["css", "scss", "sass", "less"] },
  { id: "java", name: "Java", ext: ["java"] },
  { id: "cpp", name: "C++", ext: ["cpp", "cc", "cxx", "hpp", "h"] },
  { id: "c", name: "C", ext: ["c", "h"] },
  { id: "csharp", name: "C#", ext: ["cs"] },
  { id: "php", name: "PHP", ext: ["php", "phtml"] },
  { id: "ruby", name: "Ruby", ext: ["rb", "ruby"] },
  { id: "go", name: "Go", ext: ["go"] },
  { id: "rust", name: "Rust", ext: ["rs"] },
  { id: "sql", name: "SQL", ext: ["sql"] },
  { id: "json", name: "JSON", ext: ["json"] },
  { id: "yaml", name: "YAML", ext: ["yml", "yaml"] },
  { id: "markdown", name: "Markdown", ext: ["md", "markdown"] },
  { id: "shell", name: "Shell", ext: ["sh", "bash", "zsh"] },
  { id: "powershell", name: "PowerShell", ext: ["ps1", "psm1"] },
  { id: "xml", name: "XML", ext: ["xml", "xsd", "xsl"] },
  { id: "dockerfile", name: "Dockerfile", ext: ["dockerfile"] },
  { id: "ini", name: "INI", ext: ["ini", "conf", "cfg"] },
];

interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number | null;
  executionTime: number;
  success?: boolean;
}

type RemoteCursor = {
  userId: string;
  userName?: string;
  color: string;
  position: {
    lineNumber: number;
    column: number;
  };
  socketId?: string;
};

interface CodeEditorProps {
  file: ProjectNodeFromDB | undefined;
  onChange: (value: string | undefined) => void;
  onSave: () => void;
  onExecute?: (result: ExecutionResult) => void;
  isExecuting?: boolean;
  onExecutionStart?: () => void;
  onExecutionStop?: () => void;
  executionInput?: string;
  remoteCursors?: RemoteCursor[];
  onCursorMove?: (position: { lineNumber: number; column: number }) => void;
}

export default function CodeEditor({
  file,
  onChange,
  onSave,
  onExecute,
  isExecuting = false,
  onExecutionStart,
  onExecutionStop,
  executionInput = "",
  remoteCursors = [],
  onCursorMove,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof MonacoEditor | null>(null);
  const cursorDecorationsRef = useRef<string[]>([]);
  const cursorClassCacheRef = useRef<Record<string, string>>({});

  const ensureCursorClass = useCallback((color: string) => {
    if (typeof document === "undefined") {
      return "";
    }

    const cache = cursorClassCacheRef.current;
    if (cache[color]) {
      return cache[color];
    }

    const safeKey = color.replace(/[^a-z0-9]/gi, "");
    const className = "remote-cursor-" + safeKey + "-" + Object.keys(cache).length;
    const styleId = "remote-cursor-style-" + className;

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = [
        `.${className} { position: relative; }`,
        `.${className}::before { content: ""; position: absolute; border-left: 2px solid ${color}; left: -1px; top: 0; bottom: 0; }`,
      ].join("\n");
      document.head.appendChild(style);
    }

    cache[color] = className;
    return className;
  }, []);
const detectLanguage = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const lang = SUPPORTED_LANGUAGES.find((l) => l.ext.includes(ext));
    return lang?.id || "plaintext";
  };

  const currentLanguage = file ? detectLanguage(file.name) : "javascript";

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Enhanced VS Code-like dark theme
    monaco.editor.defineTheme("enhanced-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "operator", foreground: "D4D4D4" },
        { token: "function", foreground: "DCDCAA" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "type", foreground: "4EC9B0" },
        { token: "class", foreground: "4EC9B0" },
        { token: "interface", foreground: "B8D7A3" },
        { token: "namespace", foreground: "C8C8C8" },
        { token: "parameter", foreground: "9CDCFE" },
        { token: "property", foreground: "9CDCFE" },
        { token: "tag", foreground: "569CD6" },
        { token: "attribute.name", foreground: "92C5F8" },
        { token: "attribute.value", foreground: "CE9178" },
        { token: "delimiter", foreground: "808080" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",
        "editorCursor.foreground": "#AEAFAD",
        "editor.lineHighlightBackground": "#2A2D2E",
        "editor.selectionBackground": "#264F78",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#C6C6C6",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editorGutter.background": "#1E1E1E",
        "editorWidget.background": "#252526",
        "editorWidget.border": "#454545",
        "editorSuggestWidget.background": "#252526",
        "editorSuggestWidget.border": "#454545",
        "editorSuggestWidget.foreground": "#CCCCCC",
        "editorSuggestWidget.selectedBackground": "#094771",
        "editorHoverWidget.background": "#252526",
        "editorHoverWidget.border": "#454545",
      },
    });

    // Apply the theme immediately
    monaco.editor.setTheme("enhanced-dark");

    // Enhanced language configurations
    setupLanguageFeatures(monaco);

    // Custom keybindings
    setupKeybindings(editor, monaco);

    // Error and warning handling
    setupErrorHandling(editor, monaco);
  };

  const setupLanguageFeatures = (monaco: any) => {
    // Enhanced HTML language features
    monaco.languages.registerCompletionItemProvider("html", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "!",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "HTML5 boilerplate",
          },
          {
            label: "div",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "<div${1}>\n\t${2}\n</div>",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "p",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "<p>${1}</p>",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "a",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '<a href="${1}">${2}</a>',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "img",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '<img src="${1}" alt="${2}">',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "button",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '<button type="${1:button}">${2}</button>',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "input",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '<input type="${1:text}" ${2}>',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "form",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              '<form action="${1}" method="${2:post}">\n\t${3}\n</form>',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
        ];
        return { suggestions };
      },
    });

    // Enhanced CSS language features
    monaco.languages.registerCompletionItemProvider("css", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "flex-center",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "display: flex;\njustify-content: center;\nalign-items: center;",
            documentation: "Flexbox center alignment",
          },
          {
            label: "grid-center",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "display: grid;\nplace-items: center;",
            documentation: "Grid center alignment",
          },
          {
            label: "transition",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "transition: ${1:property} ${2:0.3s} ${3:ease};",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "box-shadow",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "box-shadow: ${1:0 2px 4px} rgba(0, 0, 0, ${2:0.1});",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
        ];
        return { suggestions };
      },
    });

    // JavaScript/TypeScript configuration
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      strict: true,
      typeRoots: ["node_modules/@types"],
    });

    // Add common type definitions
    const commonTypes = `
      declare const console: {
        log(...args: any[]): void;
        error(...args: any[]): void;
        warn(...args: any[]): void;
        info(...args: any[]): void;
      };
      declare const process: {
        env: Record<string, string>;
        argv: string[];
        version: string;
      };
      declare const require: (id: string) => any;
      declare const module: { exports: any };
      declare const exports: any;
      declare const __dirname: string;
      declare const __filename: string;
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      commonTypes,
      "file:///node_modules/@types/common.d.ts"
    );

    // Enhanced Python language features
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "print",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "print(${1})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "def",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "def ${1:function_name}(${2}):\n    ${3:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "class",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "class ${1:ClassName}:\n    ${2:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "if",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "if ${1:condition}:\n    ${2:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "for",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "while",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "while ${1:condition}:\n    ${2:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "try",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText:
              "try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:pass}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "import",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "import ${1:module}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "from",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "from ${1:module} import ${2:function}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "list_comprehension",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "[${1:expr} for ${2:item} in ${3:iterable}]",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "List comprehension",
          },
          {
            label: "dict_comprehension",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Dictionary comprehension",
          },
        ];
        return { suggestions };
      },
    });

    // Enhanced JavaScript/TypeScript features
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "function",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText:
              "function ${1:name}(${2:params}) {\n    ${3:// code}\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "arrow",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "const ${1:name} = (${2:params}) => {\n    ${3:// code}\n};",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Arrow function",
          },
          {
            label: "async",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText:
              "async function ${1:name}(${2:params}) {\n    ${3:// code}\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "promise",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "new Promise((resolve, reject) => {\n    ${1:// code}\n})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "fetch",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText:
              "fetch('${1:url}')\n    .then(response => response.json())\n    .then(data => {\n        ${2:// handle data}\n    })",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
        ];
        return { suggestions };
      },
    });

    monaco.languages.registerCompletionItemProvider("typescript", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "interface",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText:
              "interface ${1:Name} {\n    ${2:property}: ${3:type};\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "type",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "type ${1:Name} = ${2:type};",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: "enum",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "enum ${1:Name} {\n    ${2:VALUE} = '${3:value}',\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
        ];
        return { suggestions };
      },
    });
  };

  const setupKeybindings = (editor: any, monaco: any) => {
    // Save: Ctrl/Cmd + S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Run: Ctrl/Cmd + R or F5 - This will trigger execution via parent component
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      if (file?.content && onExecute) {
        executeCode();
      }
    });

    editor.addCommand(monaco.KeyCode.F5, () => {
      if (file?.content && onExecute) {
        executeCode();
      }
    });

    // Format: Alt + Shift + F
    editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        editor.getAction("editor.action.formatDocument")?.run();
      }
    );

    // Comment: Ctrl/Cmd + /
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction("editor.action.commentLine")?.run();
    });

    // Find: Ctrl/Cmd + F
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction("actions.find")?.run();
    });
  };

  const setupErrorHandling = (editor: any, monaco: any) => {
    // Real-time error checking for supported languages
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;

      const language = model.getLanguageId();
      const code = model.getValue();

      // Simple syntax validation for different languages
      validateSyntax(code, language, monaco, model);
    });
  };

  const validateSyntax = (
    code: string,
    language: string,
    monaco: any,
    model: any
  ) => {
    const markers: any[] = [];

    try {
      switch (language) {
        case "javascript":
        case "typescript":
          // Monaco handles JS/TS validation automatically
          break;

        case "python":
          validatePythonSyntax(code, markers, monaco);
          break;

        case "json":
          validateJsonSyntax(code, markers, monaco);
          break;

        default:
          break;
      }

      monaco.editor.setModelMarkers(model, "syntax", markers);
    } catch (error) {
      console.error("Syntax validation error:", error);
    }
  };

  const validatePythonSyntax = (code: string, markers: any[], monaco: any) => {
    const lines = code.split("\n");

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Check indentation
      if (trimmedLine) {
        const currentIndent = line.length - line.trimStart().length;
        if (currentIndent % 4 !== 0) {
          markers.push({
            startLineNumber: lineIndex + 1,
            endLineNumber: lineIndex + 1,
            startColumn: 1,
            endColumn: currentIndent + 1,
            message: "Indentation should be a multiple of 4 spaces",
            severity: monaco.MarkerSeverity.Warning,
          });
        }
      }
    });
  };

  const validateJsonSyntax = (code: string, markers: any[], monaco: any) => {
    // Skip validation for empty or whitespace-only content
    if (!code.trim()) return;

    try {
      JSON.parse(code);
    } catch (error: any) {
      // Improved error handling for various JSON syntax errors
      let lineNumber = 1;
      let column = 1;
      let errorMessage = error.message;

      // Try to extract position information from different error message formats
      const positionMatch = error.message.match(/position (\d+)/);
      const lineColumnMatch = error.message.match(/line (\d+) column (\d+)/);

      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const lines = code.substring(0, position).split("\n");
        lineNumber = lines.length;
        column = lines[lines.length - 1].length + 1;
      } else if (lineColumnMatch) {
        lineNumber = parseInt(lineColumnMatch[1]);
        column = parseInt(lineColumnMatch[2]);
      }

      // Provide more user-friendly error messages
      if (errorMessage.includes('Unexpected token')) {
        errorMessage = `JSON Syntax Error: ${errorMessage}. Check for missing commas, quotes, or brackets.`;
      } else if (errorMessage.includes('Unexpected end')) {
        errorMessage = `JSON Syntax Error: Unexpected end of input. Check for unclosed brackets, braces, or quotes.`;
      } else if (errorMessage.includes('Bad control character')) {
        errorMessage = `JSON Syntax Error: Invalid control character. Special characters need to be escaped.`;
      } else if (errorMessage.includes('Bad escaped character')) {
        errorMessage = `JSON Syntax Error: Invalid escape sequence. Use proper JSON escape sequences (\\n, \\t, \\", \\\\, etc.).`;
      } else {
        errorMessage = `JSON Syntax Error: ${errorMessage}`;
      }

      markers.push({
        startLineNumber: lineNumber,
        endLineNumber: lineNumber,
        startColumn: Math.max(1, column - 1),
        endColumn: column + 1,
        message: errorMessage,
        severity: monaco.MarkerSeverity.Error,
      });
    }
  };

  // Helper function to safely handle content with special characters
  const sanitizeContent = useCallback((content: string): string => {
    // Remove or replace problematic characters that can cause issues
    return content
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove control characters
      .replace(/\u2028/g, "\\u2028") // Escape line separator
      .replace(/\u2029/g, "\\u2029"); // Escape paragraph separator
  }, []);

  const executeCode = useCallback(async () => {
    if (!file || !onExecute || isExecuting) return;

    onExecutionStart?.();
    const startTime = Date.now();

    try {
      // Dynamically import the API service
      const { codeExecutionAPI } = await import(/* webpackChunkName: "code-execution-api" */ '@/lib/api/codeExecution');

      // Detect the language for the current file
      const detectedLanguage = codeExecutionAPI.detectLanguageFromFileName(file.name);

      const codeContent = sanitizeContent(file.content ?? "");
      const normalizedUserInput = (executionInput ?? "").replace(/\r\n/g, "\n");

      const effectiveInput = normalizedUserInput;

      const result = await codeExecutionAPI.executeCode({
        language: detectedLanguage,
        code: codeContent,
        input: effectiveInput,
        timeout: 30000, // 30 second timeout
      });

      onExecute({
        output: result.output,
        error: result.error,
        exitCode:
          typeof result.exitCode === "number" && Number.isFinite(result.exitCode)
            ? result.exitCode
            : null,
        executionTime: result.executionTime,
        success: result.success,
      });
    } catch (error: any) {
      const executionResult: ExecutionResult = {
        output: "",
        error: error.message || "Failed to execute code",
        exitCode: null,
        executionTime: Date.now() - startTime,
        success: false,
      };

      onExecute(executionResult);
    } finally {
      onExecutionStop?.();
    }
  }, [
    file,
    isExecuting,
    onExecute,
    onExecutionStart,
    onExecutionStop,
    executionInput,
    sanitizeContent,
  ]);

  // Listen for execution events from workspace Run button
  useEffect(() => {
    const handleExecuteEvent = () => {
      executeCode();
    };

    window.addEventListener("codeEditorExecute", handleExecuteEvent);
    return () => window.removeEventListener("codeEditorExecute", handleExecuteEvent);
  }, [executeCode]);


  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !onCursorMove) {
      return;
    }

    const disposable = editor.onDidChangeCursorPosition((event) => {
      const position = event.position;
      onCursorMove({
        lineNumber: position.lineNumber,
        column: position.column,
      });
    });

    return () => {
      disposable.dispose();
    };
  }, [onCursorMove]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      return;
    }

    const decorations = remoteCursors.map((cursor) => {
      const className = ensureCursorClass(cursor.color);
      const range = new monaco.Range(
        cursor.position.lineNumber,
        cursor.position.column,
        cursor.position.lineNumber,
        cursor.position.column
      );

      const label = cursor.userName ? cursor.userName : "Collaborator";

      return {
        range,
        options: {
          className,
          hoverMessage: { value: "**" + label + "**" },
        },
      };
    });

    cursorDecorationsRef.current = editor.deltaDecorations(
      cursorDecorationsRef.current,
      decorations
    );
  }, [remoteCursors, ensureCursorClass]);

  useEffect(() => {
    return () => {
      if (editorRef.current && cursorDecorationsRef.current.length) {
        editorRef.current.deltaDecorations(cursorDecorationsRef.current, []);
      }
      cursorDecorationsRef.current = [];
    };
  }, []);
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium">
            Select a file to begin editing
          </div>
          <p className="text-sm">
            Choose a file from the explorer to start coding
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#1E1E1E]">
      <Editor
        height="100%"
        language={currentLanguage}
        value={file.content || ""}
        theme="enhanced-dark"
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily:
            "'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace",
          fontLigatures: true,
          minimap: { enabled: true, side: "right" },
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "all",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          quickSuggestionsDelay: 100,
          parameterHints: { enabled: true },
          formatOnType: true,
          formatOnPaste: true,
          tabSize: currentLanguage === "python" ? 4 : 2,
          insertSpaces: true,
          detectIndentation: true,
          renderWhitespace: "selection",
          rulers: [],
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
          },
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          wordBasedSuggestions: "currentDocument",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          mouseWheelZoom: true,
        }}
      />
    </div>
  );
}

















