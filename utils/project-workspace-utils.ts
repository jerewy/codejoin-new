/**
 * Utility functions for Project Workspace
 * Extracted from project-workspace.tsx to reduce code duplication and improve maintainability
 */

import type { ProjectNodeFromDB } from "@/lib/types";
import { LANGUAGE_MAPPINGS, STORAGE_KEYS } from "@/types/project-workspace";

// Language detection utilities
export const getFileExtension = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : "";
};

export const detectLanguageFromFileName = (fileName: string): string => {
  const extension = getFileExtension(fileName);
  return LANGUAGE_MAPPINGS[extension] || "javascript";
};

export const getTrackingLanguageKey = (language?: string | null): string => {
  if (!language) return "default";
  const normalized = language.toLowerCase();
  return normalized === "javascript" ? "default" : normalized;
};

// Interactive code detection
export const stripCommentsAndStrings = (code: string): string => {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/#.*$/gm, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ")
    .replace(/`(?:\\.|[^`\\])*`/g, " ");
};

export const shouldUseInteractiveExecution = (
  fileName: string,
  codeContent: string
): boolean => {
  const extension = getFileExtension(fileName).toLowerCase();
  const normalizedSource = stripCommentsAndStrings(codeContent);

  if (!normalizedSource.trim()) {
    return false;
  }

  const interactivePatterns: RegExp[] = [
    /\bscanf\s*\(/,
    /\bgets\s*\(/,
    /\bfgets\s*\(/,
    /\binput\s*\(/,
    /\bnew\s+Scanner\b/,
    /\bnext(?:Int|Line|Double|Float)\s*\(/,
    /\bcin\s*>>/,
    /\breadline\s*\(/,
  ];

  const interactiveExtensions = new Set([
    ".c",
    ".cpp",
    ".cc",
    ".cxx",
    ".py",
    ".java",
    ".js",
    ".ts",
    ".tsx",
    ".mjs",
    ".jsx",
    ".rb",
    ".go",
    ".sh",
  ]);

  if (!interactiveExtensions.has(extension)) {
    return false;
  }

  return interactivePatterns.some((pattern) => pattern.test(normalizedSource));
};

// Client ID generation
export const createClientId = (): string => {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2, 11)}`;
};

// Storage utilities
export const getLocalStorageKey = (projectId: string, suffix: string = ""): string => {
  return `${STORAGE_KEYS.LOCAL_STORAGE_PREFIX}:${projectId}${suffix ? `:${suffix}` : ""}`;
};

export const parseJsonSafely = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

export const stringifyJsonSafely = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
};

// Node utilities
export const mergeNodesWithLocalState = (
  initialNodes: ProjectNodeFromDB[],
  persistedNodes: ProjectNodeFromDB[]
): ProjectNodeFromDB[] => {
  if (!persistedNodes.length) {
    return initialNodes;
  }

  const persistedById = new Map<string, ProjectNodeFromDB>();
  persistedNodes.forEach((node) => {
    persistedById.set(node.id, node);
  });

  const merged: ProjectNodeFromDB[] = initialNodes.map((node) => {
    const persisted = persistedById.get(node.id);
    return persisted ? { ...node, ...persisted } : node;
  });

  persistedNodes.forEach((node) => {
    if (!merged.some((existing) => existing.id === node.id)) {
      merged.push(node);
    }
  });

  return merged;
};

export const findDefaultFile = (nodes: ProjectNodeFromDB[]): ProjectNodeFromDB | null => {
  return nodes.find((n) => n.type === "file") || null;
};

export const findNodeById = (nodes: ProjectNodeFromDB[], id: string): ProjectNodeFromDB | null => {
  return nodes.find((n) => n.id === id) || null;
};

// Execution time formatting
export const formatExecutionTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// File operations
export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const getFileBaseName = (fileName: string): string => {
  const name = fileName.split("/").pop() || fileName;
  return name.includes(".") ? name.split(".").slice(0, -1).join(".") : name;
};

export const isTextFile = (fileName: string): boolean => {
  const textExtensions = new Set([
    ".js", ".ts", ".jsx", ".tsx", ".mjs",
    ".py", ".java", ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp",
    ".go", ".rs", ".rb", ".php",
    ".html", ".css", ".scss", ".less", ".sass",
    ".json", ".xml", ".yaml", ".yml", ".toml", ".ini",
    ".md", ".txt", ".csv", ".log",
    ".sh", ".bat", ".ps1", ".zsh", ".bash",
    ".sql", ".graphql", ".gql",
  ]);
  const extension = getFileExtension(fileName);
  return textExtensions.has(extension);
};

// Command generation for terminal execution
export const generateRunCommand = (filename: string, language: string): string => {
  const extension = getFileExtension(filename);
  const baseName = getFileBaseName(filename);

  switch (extension) {
    case ".js":
    case ".mjs":
      return `node ${filename}`;

    case ".py":
      return `python3 ${filename}`;

    case ".java":
      return `javac ${filename} && java ${baseName}`;

    case ".c":
      return `gcc -o ${baseName} ${filename} && ./${baseName}`;

    case ".cpp":
    case ".cc":
    case ".cxx":
      return `g++ -o ${baseName} ${filename} && ./${baseName}`;

    case ".go":
      return `go run ${filename}`;

    case ".rs":
      return `rustc ${filename} && ./${baseName}`;

    case ".sh":
    case ".bash":
      return `chmod +x ${filename} && ./${filename}`;

    case ".php":
      return `php ${filename}`;

    case ".rb":
      return `ruby ${filename}`;

    case ".pl":
      return `perl ${filename}`;

    default:
      return `echo "Unsupported file type: ${extension}"`;
  }
};

// Validation utilities
export const isValidNodeId = (id: string): boolean => {
  return typeof id === "string" && id.length > 0;
};

export const isValidProjectId = (id: string): boolean => {
  return typeof id === "string" && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id);
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Error handling utilities
export const createErrorContext = (error: Error, context: Record<string, any>) => {
  return {
    ...error,
    context,
    timestamp: new Date().toISOString(),
  };
};

export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError ||
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    error.code === "NETWORK_ERROR"
  );
};

// Constants
export const DEFAULT_LANGUAGE = "javascript";
export const DEFAULT_FILE_NAME = "untitled";
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const MAX_FILENAME_LENGTH = 255;