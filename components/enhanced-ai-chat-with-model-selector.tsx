"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Brain, Loader2, ArrowDown, Settings, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EnhancedAIMessage from "./enhanced-ai-message";
import AIModelSelector, { AIModelHealthSummary } from "./ai-model-selector";
import AIModelStatusIndicator from "./ai-model-status-indicator";
import {
  DEFAULT_MODELS,
  DEFAULT_MODEL_SETTINGS,
  type AIModelConfig,
  type AIModelSettings
} from "@/types/ai-model";
import { aiModelSettingsService } from "@/lib/ai-model-settings-service";
import { aiModelStatusService } from "@/lib/ai-model-status-service";

interface EnhancedAIChatWithModelSelectorProps {
  projectId?: string;
  userId?: string;
  initialModel?: string;
  onModelChange?: (modelId: string) => void;
  onStatusChange?: (status: {
    connectionStatus: any;
    error: any;
    currentModel: string;
  }) => void;
  showModelSelector?: boolean;
  showHealthSummary?: boolean;
  className?: string;
}

export default function EnhancedAIChatWithModelSelector({
  projectId,
  userId,
  initialModel,
  onModelChange,
  onStatusChange,
  showModelSelector = true,
  showHealthSummary = false,
  className
}: EnhancedAIChatWithModelSelectorProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    modelUsed?: string;
    responseTime?: number;
    isTyping?: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentModel, setCurrentModel] = useState(initialModel || DEFAULT_MODEL_SETTINGS.preferredModel);
  const [settings, setSettings] = useState<AIModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [modelStatuses, setModelStatuses] = useState<Record<string, any>>({});
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [autoFallbackTriggered, setAutoFallbackTriggered] = useState(false);

  // Initialize settings and model monitoring
  useEffect(() => {
    const initialSettings = aiModelSettingsService.getSettings();
    setSettings(initialSettings);
    setCurrentModel(initialSettings.preferredModel);

    // Start model health monitoring
    aiModelStatusService.startHealthChecks(DEFAULT_MODELS, 30000);

    // Listen for status updates
    const unsubscribeStatus = aiModelStatusService.addStatusListener((statuses) => {
      setModelStatuses(statuses);

      // Auto-switch if current model goes offline and auto-switch is enabled
      const currentModelStatus = statuses[currentModel];
      if (
        initialSettings.autoSwitchOnError &&
        currentModelStatus &&
        (currentModelStatus.status === 'offline' || currentModelStatus.status === 'error') &&
        initialSettings.fallbackEnabled &&
        initialSettings.fallbackModel &&
        initialSettings.fallbackModel !== currentModel
      ) {
        handleAutoSwitch(initialSettings.fallbackModel);
      }
    });

    // Listen for settings changes
    const unsubscribeSettings = aiModelSettingsService.addSettingsListener((newSettings) => {
      setSettings(newSettings);
      setCurrentModel(newSettings.preferredModel);
    });

    // Get initial statuses
    setModelStatuses(aiModelStatusService.getAllStatuses());

    return () => {
      unsubscribeStatus();
      unsubscribeSettings();
    };
  }, [currentModel]);

  // Auto-switch to fallback model
  const handleAutoSwitch = useCallback((fallbackModelId: string) => {
    setAutoFallbackTriggered(true);
    setCurrentModel(fallbackModelId);
    aiModelSettingsService.setPreferredModel(fallbackModelId);

    toast({
      title: "Model Auto-Switched",
      description: `Switched to fallback model due to connectivity issues.`,
      variant: "default",
    });

    setTimeout(() => setAutoFallbackTriggered(false), 5000);
  }, [toast]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        connectionStatus: modelStatuses[currentModel]?.status || 'unknown',
        error: modelStatuses[currentModel]?.errorMessage,
        currentModel,
      });
    }
  }, [modelStatuses, currentModel, onStatusChange]);

  // Enhanced scroll to bottom functionality
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    if (force) {
      setShowScrollToBottom(false);
    }
  }, []);

  // Handle scroll detection
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollToBottom(!isAtBottom && messages.length > 0);
    }
  }, [messages.length]);

  // Auto scroll when messages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId);
    onModelChange?.(modelId);
    aiModelSettingsService.setPreferredModel(modelId);
  }, [onModelChange]);

  // Send message with model selection
  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading || !userId) return;

    setIsLoading(true);
    setIsTyping(true);
    setMessage("");

    // Add user message
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const startTime = Date.now();
      let endpoint = '/api/ai/chat'; // Default cloud endpoint
      let selectedModel = currentModel;

      // Hybrid mode logic
      if (currentModel === 'hybrid-smart' && settings.enableHybridMode) {
        // Choose best model based on request type and availability
        const localModelStatus = modelStatuses['deepseek-coder-6.7b'];
        const cloudModelStatus = modelStatuses['gemini-pro'];

        // Prefer local for code-related queries if it's online
        const isCodeRequest = /\b(code|function|debug|programming|algorithm)\b/i.test(trimmed);

        if (isCodeRequest && localModelStatus?.status === 'online') {
          selectedModel = 'deepseek-coder-6.7b';
          endpoint = '/api/local-ai/chat';
        } else if (cloudModelStatus?.status === 'online') {
          selectedModel = 'gemini-pro';
          endpoint = '/api/ai/chat';
        } else if (localModelStatus?.status === 'online') {
          selectedModel = 'deepseek-coder-6.7b';
          endpoint = '/api/local-ai/chat';
        } else {
          throw new Error('No models are currently available');
        }
      } else {
        // Use selected model
        const modelConfig = DEFAULT_MODELS.find(m => m.id === currentModel);
        if (modelConfig) {
          endpoint = modelConfig.endpoint;
        }
      }

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          context: {
            projectId,
            conversationId: 'chat',
            timestamp: new Date().toISOString(),
          }
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Record successful request
      aiModelStatusService.recordModelRequest(selectedModel, true, responseTime, data.metadata?.tokensUsed);

      // Add AI response
      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: data.response || data.message || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
        modelUsed: selectedModel,
        responseTime,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to send message:', error);

      // Record failed request
      aiModelStatusService.recordModelRequest(currentModel, false, 0);

      // Try fallback if enabled
      if (settings.fallbackEnabled && settings.fallbackModel && settings.fallbackModel !== currentModel) {
        try {
          toast({
            title: "Primary Model Failed",
            description: "Trying fallback model...",
            variant: "default",
          });

          const fallbackModel = DEFAULT_MODELS.find(m => m.id === settings.fallbackModel);
          if (fallbackModel) {
            const fallbackResponse = await fetch(fallbackModel.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: trimmed,
                context: {
                  projectId,
                  conversationId: 'chat',
                  timestamp: new Date().toISOString(),
                  isFallback: true,
                }
              }),
            });

            const fallbackData = await fallbackResponse.json();

            if (fallbackResponse.ok) {
              const fallbackMessage = {
                id: `ai_fallback_${Date.now()}`,
                role: 'assistant' as const,
                content: fallbackData.response || fallbackData.message || 'Sorry, I encountered an error.',
                timestamp: new Date().toISOString(),
                modelUsed: settings.fallbackModel,
                responseTime: 0,
              };

              setMessages(prev => [...prev, fallbackMessage]);

              toast({
                title: "Fallback Model Used",
                description: `Responded with ${fallbackModel.name}`,
                variant: "default",
              });
            } else {
              throw new Error('Fallback also failed');
            }
          }
        } catch (fallbackError) {
          // Both primary and fallback failed
          setMessages(prev => [...prev, {
            id: `ai_error_${Date.now()}`,
            role: 'assistant' as const,
            content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
            timestamp: new Date().toISOString(),
            modelUsed: 'error',
            responseTime: 0,
          }]);

          toast({
            title: "Message Failed",
            description: "Both primary and fallback models are unavailable.",
            variant: "destructive",
          });
        }
      } else {
        // No fallback enabled or fallback failed
        setMessages(prev => [...prev, {
          id: `ai_error_${Date.now()}`,
          role: 'assistant' as const,
          content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
          timestamp: new Date().toISOString(),
          modelUsed: 'error',
          responseTime: 0,
        }]);

        toast({
          title: "Message Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [message, isLoading, userId, projectId, currentModel, settings, modelStatuses, toast]);

  const currentModelConfig = DEFAULT_MODELS.find(m => m.id === currentModel);
  const currentModelStatus = modelStatuses[currentModel];

  return (
    <div className={className}>
      <Card className="h-[700px] flex flex-col">
        {/* Header with model selector */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Assistant</CardTitle>
              </div>

              {/* Auto-fallback indicator */}
              {autoFallbackTriggered && (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200">
                  <AlertTriangle className="h-3 w-3" />
                  Auto-switched to fallback
                </Badge>
              )}

              {/* Model status indicator */}
              {currentModelStatus && (
                <AIModelStatusIndicator
                  model={currentModelConfig || DEFAULT_MODELS[0]}
                  status={currentModelStatus}
                  compact
                />
              )}
            </div>

            {/* Compact model selector */}
            {showModelSelector && (
              <AIModelSelector
                currentModel={currentModel}
                onModelChange={handleModelChange}
                compact
                showStatus
              />
            )}
          </div>

          {/* Model info */}
          {currentModelConfig && settings.showModelInfo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>
                Using {currentModelConfig.name}
                {currentModelConfig.provider === 'hybrid' && ' (Smart Selection)'}
              </span>
              {currentModelStatus?.responseTime && (
                <span>• {currentModelStatus.responseTime}ms response time</span>
              )}
            </div>
          )}

          {/* Health summary */}
          {showHealthSummary && (
            <AIModelHealthSummary models={DEFAULT_MODELS} className="mt-3" />
          )}
        </CardHeader>

        <Separator />

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-lg">
                Ask me anything about coding, debugging, or learning. I'll use the best available model to help you.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Model: {currentModelConfig?.name}</span>
                <span>•</span>
                <span>Provider: {currentModelConfig?.provider}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <EnhancedAIMessage key={msg.id} message={msg} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder={
                currentModelConfig?.provider === 'local'
                  ? "Ask me anything (Local AI)..."
                  : currentModelConfig?.provider === 'cloud'
                  ? "Ask me anything (Cloud AI)..."
                  : "Ask me anything (Smart Selection)..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              disabled={isLoading || !currentModelStatus || currentModelStatus.status === 'offline'}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim() || !currentModelStatus || currentModelStatus.status === 'offline'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Model info bar */}
          {currentModelConfig && (
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Model: {currentModelConfig.name}</span>
                <span>Provider: {currentModelConfig.provider}</span>
                {currentModelStatus?.responseTime && (
                  <span>Response: {currentModelStatus.responseTime}ms</span>
                )}
              </div>
              {currentModelStatus?.status === 'offline' && (
                <span className="text-red-500">Model is offline</span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="fixed bottom-24 right-8 z-40">
          <Button
            onClick={() => scrollToBottom(true)}
            size="sm"
            className="rounded-full w-10 h-10 p-0 shadow-lg bg-primary hover:bg-primary/90"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}