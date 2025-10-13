"use client";

import { useState } from "react";
import { AIAssistantHealthCheck } from "@/components/ai-assistant-health-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAIConversations } from "@/hooks/use-ai-conversations";

export default function DebugAIAssistant() {
  const { toast } = useToast();
  const [testProjectId, setTestProjectId] = useState("b6a9df73-46af-48ad-adf8-60211f57311b");
  const [testMessage, setTestMessage] = useState("Hello AI Assistant! This is a debug test message.");

  // Test the conversation hook with the test project
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    createConversation,
    addMessage,
    getOrCreateConversation,
  } = useAIConversations({
    projectId: testProjectId,
    userId: undefined, // Will be set automatically when authenticated
    autoLoad: true,
  });

  const handleCreateConversation = async () => {
    try {
      const conversation = await createConversation("Debug Test Conversation");
      if (conversation) {
        toast({
          title: "✅ Conversation Created",
          description: `ID: ${conversation.id}`,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Failed to Create Conversation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleGetOrCreateConversation = async () => {
    try {
      const conversation = await getOrCreateConversation("Debug Test Conversation");
      if (conversation) {
        toast({
          title: "✅ Conversation Retrieved/Created",
          description: `ID: ${conversation.id}`,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Failed to Get/Create Conversation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentConversation) {
      toast({
        title: "❌ No Active Conversation",
        description: "Please create or select a conversation first",
        variant: "destructive",
      });
      return;
    }

    try {
      const message = await addMessage(currentConversation.id, {
        role: "user",
        content: testMessage,
        metadata: { debug: true },
      });

      if (message) {
        toast({
          title: "✅ Message Sent",
          description: `ID: ${message.id}`,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Failed to Send Message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const runDiagnosticTests = () => {
    console.log('🧪 Running AI Assistant Diagnostic Tests...');

    // Check authentication
    console.log('📋 Authentication Check:');
    console.log('Current conversation:', currentConversation);
    console.log('Messages count:', messages.length);
    console.log('Loading state:', loading);
    console.log('Error state:', error);
    console.log('Conversations:', conversations.length);

    // Test the test script if available
    if (typeof window.testAIAssistant === 'function') {
      window.testAIAssistant();
    } else {
      console.log('📋 Loading test script...');
      const script = document.createElement('script');
      script.src = '/test-ai-assistant-fixes.js';
      script.onload = () => {
        if (typeof window.testAIAssistant === 'function') {
          window.testAIAssistant();
        }
      };
      document.head.appendChild(script);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">AI Assistant Debug Page</h1>
        <p className="text-muted-foreground">
          Use this page to test and debug AI assistant functionality
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Health Check */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <AIAssistantHealthCheck />
          </CardContent>
        </Card>

        {/* Current State */}
        <Card>
          <CardHeader>
            <CardTitle>Current State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Loading:</span>
              <span className={loading ? "text-yellow-600" : "text-green-600"}>
                {loading ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <span className={error ? "text-red-600" : "text-green-600"}>
                {error || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Conversations:</span>
              <span>{conversations.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Conversation:</span>
              <span className="font-mono text-xs">
                {currentConversation?.id || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Messages:</span>
              <span>{messages.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Project ID</label>
                <Input
                  value={testProjectId}
                  onChange={(e) => setTestProjectId(e.target.value)}
                  placeholder="Enter project ID to test"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Message</label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter message to send"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreateConversation} disabled={loading}>
                Create Conversation
              </Button>
              <Button onClick={handleGetOrCreateConversation} disabled={loading}>
                Get/Create Conversation
              </Button>
              <Button onClick={handleSendMessage} disabled={loading || !currentConversation}>
                Send Test Message
              </Button>
              <Button variant="outline" onClick={runDiagnosticTests}>
                Run Diagnostics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <strong>Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Sign in to test conversation creation and messaging</li>
                <li>Use the "Create Conversation" button to test conversation creation</li>
                <li>Use the "Send Test Message" button to test message sending</li>
                <li>Check the browser console for detailed debug information</li>
                <li>Run "Run Diagnostics" to execute comprehensive tests</li>
              </ol>
              <p className="pt-2">
                <strong>Common Issues:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Authentication required for most operations</li>
                <li>Check browser console for detailed error messages</li>
                <li>Ensure Supabase is properly configured</li>
                <li>Verify project ID is valid and accessible</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}