/**
 * Centralized type definitions for Project Workspace
 * Extracted from project-workspace.tsx to improve type safety and organization
 */

import type { ProjectNodeFromDB, ProjectChatMessageWithAuthor, Collaborator } from "@/lib/types";

// Re-export commonly used types
export type { ProjectNodeFromDB, ProjectChatMessageWithAuthor, Collaborator };

// Execution result interface
export interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number | null;
  executionTime: number;
  success?: boolean;
}

// Problem interface for code issues
export interface Problem {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  source: string;
}

// Autosave state
export type AutosaveState = "idle" | "saving" | "saved" | "error";

// Terminal execution state
export interface TerminalExecutionState {
  isExecuting: boolean;
  sessionId: string | null;
  isReady: boolean;
  activeLanguage: string | null;
}

// Terminal session state
export interface TerminalSessionState {
  sessionId: string | null;
  isReady: boolean;
  isStarting: boolean;
  isStopping: boolean;
  activeLanguage: string | null;
}

// Terminal output
export interface TerminalOutput {
  chunk: string;
  timestamp: Date;
}

// Execution options
export interface ExecutionOptions {
  onStatusUpdate?: (message: string) => void;
  onError?: (error: Error) => void;
}

// Project workspace props
export interface ProjectWorkspaceProps {
  initialNodes: ProjectNodeFromDB[];
  projectId: string;
  conversationId: string | null;
  initialChatMessages: ProjectChatMessageWithAuthor[];
  teamMembers: Collaborator[];
}

// File content state
export interface FileContentState {
  nodes: ProjectNodeFromDB[];
  activeNodeId: string | null;
  hasUnsavedChanges: boolean;
  autosaveState: AutosaveState;
}

// Collaboration state
export interface CollaborationState {
  isVideoCallActive: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isSpeakerOn: boolean;
  isChatOpen: boolean;
  showChat: boolean;
  showSidebar: boolean;
}

// AI state
export interface AIState {
  isAIAssistantOpen: boolean;
  aiMessage: string;
  isAIThinking: boolean;
  isAIVoiceActive: boolean;
}

// View mode
export type ViewMode = "code" | "preview" | "split";

// Language configuration
export interface LanguageConfig {
  id: string;
  name: string;
  fileExtension: string;
  supportsInteractive: boolean;
}

// Terminal event types
export interface TerminalReadyEvent {
  sessionId: string;
}

export interface TerminalDataEvent {
  sessionId: string;
  chunk: string;
}

export interface TerminalErrorEvent {
  sessionId?: string;
  message: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code?: number | null;
  reason?: string;
}

// Execution event types
export interface TerminalExecutionEvent {
  code: string;
  language: string;
  fileName: string;
}

// Storage key configuration
export const STORAGE_KEYS = {
  LOCAL_STORAGE_PREFIX: "codejoin:project",
  AUTOSAVE_PREFIX: "autosave:",
} as const;

// Default configurations
export const DEFAULT_CONFIG = {
  AUTOSAVE_DELAY: 2000,
  EXECUTION_TIMEOUT: 30000,
  TERMINAL_TIMEOUT: 10000,
  MAX_EXECUTION_RETRIES: 3,
} as const;

// Language detection mappings
export const LANGUAGE_MAPPINGS: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.jsx': 'javascript',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.go': 'go',
  '.rs': 'rust',
  '.sh': 'shell',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
  '.md': 'markdown',
} as const;

// Safe terminal language fallbacks
export const SAFE_TERMINAL_LANGUAGE_FALLBACKS = [
  "javascript",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "typescript",
] as const;