"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useOpenRouterAI } from '@/hooks/use-openrouter-ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, Bot, User, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

export default function OpenRouterChatDemo() {
  const [message, setMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    isLoading,
    error,
    response,
    metadata,
    sendMessage,
    clearError,
    clearResponse
  } = useOpenRouterAI({
    timeout: 30000,
    retries: 2
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Add user message to history
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message.trim(),
      timestamp: new Date()
    };

    setConversationHistory(prev => [...prev, userMessage]);
    const messageToSend = message;
    setMessage('');

    try {
      // Send to OpenRouter
      const result = await sendMessage(messageToSend, {
        code: '',
        language: 'auto',
        conversationId: conversationHistory.length.toString(),
        projectId: 'demo'
      });

      if (result.success && result.response) {
        // Add AI response to history
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: result.response,
          timestamp: new Date(),
          metadata: result.metadata
        };
        setConversationHistory(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    clearResponse();
    clearError();
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <CardTitle>Secure OpenRouter AI Chat</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Qwen3 Coder Free
            </Badge>
          </div>
          <CardDescription>
            Chat with Qwen3 Coder model through a secure backend API. Your API keys remain protected.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Conversation History */}
          <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 space-y-4">
            {conversationHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with Qwen3 Coder!</p>
                <p className="text-sm">Ask me anything about programming, debugging, or code.</p>
              </div>
            ) : (
              conversationHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.type === 'assistant' && <Bot className="h-4 w-4 text-blue-500" />}
                      {msg.type === 'user' && <User className="h-4 w-4 text-green-500" />}
                      <span className="text-xs text-gray-500">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        msg.type === 'user'
                          ? 'bg-blue-500 text-white ml-auto'
                          : 'bg-white dark:bg-gray-800 border text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                    {msg.metadata && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatResponseTime(msg.metadata.responseTime)}</span>
                        <Zap className="h-3 w-3" />
                        <span>{msg.metadata.tokensUsed} tokens</span>
                        {msg.metadata.cached && (
                          <Badge variant="secondary" className="text-xs">
                            Cached
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about coding, debugging, or programming concepts..."
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                disabled={conversationHistory.length === 0}
              >
                Clear Conversation
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </CardContent>

        {metadata && (
          <CardFooter className="border-t bg-gray-50 dark:bg-gray-900">
            <div className="w-full">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {metadata.model}
                  </span>
                  <span>{metadata.provider}</span>
                  <span>{formatResponseTime(metadata.responseTime)}</span>
                  <span>{metadata.tokensUsed} tokens</span>
                </div>
                {metadata.requestId && (
                  <span className="text-xs text-gray-500">
                    ID: {metadata.requestId.slice(-8)}
                  </span>
                )}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Secure Integration:</strong> Your OpenRouter API key is protected and never exposed to the frontend.
          All API calls are routed through a secure backend with rate limiting and error handling.
        </AlertDescription>
      </Alert>
    </div>
  );
}