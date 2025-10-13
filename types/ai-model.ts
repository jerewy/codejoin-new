// AI Model Types for CodeJoin Platform

export type AIModelProvider = "local" | "cloud" | "hybrid";

export type AIModelStatusType =
  | "online"
  | "offline"
  | "loading"
  | "error"
  | "unknown";

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIModelProvider;
  endpoint: string;
  model: string;
  description: string;
  capabilities: string[];
  maxTokens?: number;
  contextWindow?: number;
  responseTime?: number; // in milliseconds
  lastHealthCheck?: Date;
  isAvailable?: boolean;
}

export interface AIModelStatus {
  modelId: string;
  status: AIModelStatusType;
  responseTime?: number;
  lastChecked: Date;
  errorMessage?: string;
  uptime?: number; // percentage
  tokensUsed?: number;
  requestsCount?: number;
}

export interface AIModelSettings {
  preferredModel: string;
  fallbackEnabled: boolean;
  fallbackModel?: string;
  autoSwitchOnError: boolean;
  responseTimeThreshold: number; // milliseconds
  showModelInfo: boolean;
  enableHybridMode: boolean;
}

export interface AIModelSelectorProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  models: AIModelConfig[];
  modelStatuses: Record<string, AIModelStatus>;
  settings: AIModelSettings;
  onSettingsChange: (settings: Partial<AIModelSettings>) => void;
  compact?: boolean;
  showStatus?: boolean;
  showAdvanced?: boolean;
}

export interface AIModelStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  lastRequestTime?: Date;
}

// Predefined model configurations
export const DEFAULT_MODELS: AIModelConfig[] = [
  {
    id: "deepseek-coder-6.7b",
    name: "DeepSeek Coder 6.7B",
    provider: "local",
    endpoint: "/api/local-ai/chat",
    model: "deepseek-coder:6.7b-base",
    description:
      "Local coding specialist model optimized for code generation, debugging, and technical explanations.",
    capabilities: [
      "code-generation",
      "debugging",
      "code-explanation",
      "refactoring",
    ],
    maxTokens: 4096,
    contextWindow: 4096,
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "cloud",
    endpoint: "/api/ai/chat",
    model: "gemini-pro",
    description:
      "Google's advanced multimodal AI model with strong reasoning and general knowledge capabilities.",
    capabilities: [
      "code-generation",
      "general-knowledge",
      "reasoning",
      "multimodal",
      "problem-solving",
    ],
    maxTokens: 8192,
    contextWindow: 32768,
  },
  {
    id: "hybrid-smart",
    name: "Smart Hybrid",
    provider: "hybrid",
    endpoint: "/api/ai/chat", // Will route based on request type
    model: "auto-select",
    description:
      "Automatically chooses the best model based on your request type and current system status.",
    capabilities: [
      "auto-selection",
      "load-balancing",
      "fallback",
      "optimization",
    ],
    maxTokens: 8192,
    contextWindow: 32768,
  },
];

// Default settings
export const DEFAULT_MODEL_SETTINGS: AIModelSettings = {
  preferredModel: "hybrid-smart",
  fallbackEnabled: true,
  fallbackModel: "deepseek-coder-6.7b",
  autoSwitchOnError: true,
  responseTimeThreshold: 10000, // 10 seconds
  showModelInfo: true,
  enableHybridMode: true,
};

// Model provider metadata
export const MODEL_PROVIDER_INFO = {
  local: {
    name: "Local AI",
    description: "Runs on your machine",
    icon: "🖥️",
    color: "#10b981", // green
    benefits: ["Privacy", "No cost", "Fast response", "Offline capability"],
    limitations: ["Limited knowledge", "Resource intensive"],
  },
  cloud: {
    name: "Cloud AI",
    description: "Powered by Google Gemini",
    icon: "☁️",
    color: "#3b82f6", // blue
    benefits: [
      "Advanced capabilities",
      "Always up-to-date",
      "High performance",
    ],
    limitations: [
      "Requires internet",
      "May have costs",
      "Privacy considerations",
    ],
  },
  hybrid: {
    name: "Hybrid Mode",
    description: "Best of both worlds",
    icon: "⚡",
    color: "#8b5cf6", // purple
    benefits: ["Automatic selection", "Load balancing", "Reliability"],
    limitations: ["Complex routing", "Potential latency"],
  },
};
