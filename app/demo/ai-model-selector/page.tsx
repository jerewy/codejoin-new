"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Brain, Settings, Zap, Monitor, Cloud, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import AIModelSelector from "@/components/ai-model-selector";
import AIModelStatusIndicator, { AIModelHealthSummary } from "@/components/ai-model-status-indicator";
import EnhancedAIChatWithModelSelector from "@/components/enhanced-ai-chat-with-model-selector";
import { DEFAULT_MODELS } from "@/types/ai-model";
import { useAIModels } from "@/hooks/use-ai-models";

export default function AIModelSelectorDemo() {
  const [selectedModel, setSelectedModel] = useState("hybrid-smart");
  const {
    currentModel,
    modelStatuses,
    settings,
    switchModel,
    refreshModelStatus,
    getModelConfig,
    getHealthSummary,
    testModel,
  } = useAIModels({
    autoStartMonitoring: true,
    healthCheckInterval: 15000, // 15 seconds for demo
  });

  const healthSummary = getHealthSummary();

  const handleTestModel = async (modelId: string) => {
    const result = await testModel(modelId);
    console.log(`Test result for ${modelId}:`, result);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Model Selector Demo
        </h1>
        <p className="text-muted-foreground text-lg">
          Comprehensive AI model management with automatic fallback, health monitoring, and intelligent selection.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="selector">Model Selector</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="monitoring">Health Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Local AI
                </CardTitle>
                <CardDescription>
                  DeepSeek Coder 6.7B running locally
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AIModelStatusIndicator
                    model={DEFAULT_MODELS[0]}
                    status={modelStatuses['deepseek-coder-6.7b']}
                    compact
                  />
                  <div className="text-sm space-y-1">
                    <p>• Privacy-focused processing</p>
                    <p>• No internet required</p>
                    <p>• Specialized for coding</p>
                    <p>• 4K context window</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Cloud AI
                </CardTitle>
                <CardDescription>
                  Google Gemini Pro cloud service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AIModelStatusIndicator
                    model={DEFAULT_MODELS[1]}
                    status={modelStatuses['gemini-pro']}
                    compact
                  />
                  <div className="text-sm space-y-1">
                    <p>• Advanced reasoning</p>
                    <p>• Multimodal capabilities</p>
                    <p>• Large context window</p>
                    <p>• Always up-to-date</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Hybrid Mode
                </CardTitle>
                <CardDescription>
                  Intelligent automatic selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AIModelStatusIndicator
                    model={DEFAULT_MODELS[2]}
                    status={modelStatuses['hybrid-smart']}
                    compact
                  />
                  <div className="text-sm space-y-1">
                    <p>• Smart model selection</p>
                    <p>• Load balancing</p>
                    <p>• Auto fallback</p>
                    <p>• Performance optimization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>
                Real-time status of all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIModelHealthSummary models={DEFAULT_MODELS} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
              <CardDescription>
                Active model settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Model Selection</h4>
                  <p className="text-sm text-muted-foreground">
                    Preferred: {getModelConfig(currentModel)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fallback: {settings.fallbackEnabled ? (getModelConfig(settings.fallbackModel || '')?.name || 'None') : 'Disabled'}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={settings.fallbackEnabled ? "default" : "secondary"}>
                      Fallback: {settings.fallbackEnabled ? 'On' : 'Off'}
                    </Badge>
                    <Badge variant={settings.autoSwitchOnError ? "default" : "secondary"}>
                      Auto-switch: {settings.autoSwitchOnError ? 'On' : 'Off'}
                    </Badge>
                    <Badge variant={settings.enableHybridMode ? "default" : "secondary"}>
                      Hybrid: {settings.enableHybridMode ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selector" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compact Model Selector</CardTitle>
                <CardDescription>
                  Minimal selector for headers and toolbars
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <AIModelSelector
                    currentModel={selectedModel}
                    onModelChange={setSelectedModel}
                    compact
                    showStatus
                  />
                  <div className="text-sm text-muted-foreground">
                    Selected: {getModelConfig(selectedModel)?.name}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Full Model Selector</CardTitle>
                <CardDescription>
                  Complete selector with detailed information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIModelSelector
                  currentModel={selectedModel}
                  onModelChange={setSelectedModel}
                  showAdvanced
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Model Status Indicators</CardTitle>
              <CardDescription>
                Real-time status display for all models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEFAULT_MODELS.map((model) => (
                  <div key={model.id} className="space-y-2">
                    <h4 className="font-medium">{model.name}</h4>
                    <AIModelStatusIndicator
                      model={model}
                      status={modelStatuses[model.id]}
                      showDetails
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestModel(model.id)}
                      className="w-full"
                    >
                      Test Model
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat with Model Selection</CardTitle>
              <CardDescription>
                Interactive chat with dynamic model switching and fallback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedAIChatWithModelSelector
                projectId="demo-project"
                userId="demo-user"
                initialModel={currentModel}
                onModelChange={(modelId) => {
                  console.log('Model changed to:', modelId);
                  switchModel(modelId);
                }}
                showModelSelector
                showHealthSummary={false}
                className="h-[600px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Health Status</CardTitle>
                <CardDescription>
                  Detailed health information for each model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DEFAULT_MODELS.map((model) => {
                    const status = modelStatuses[model.id];
                    return (
                      <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {status?.status === 'online' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : status?.status === 'offline' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                            <span className="font-medium">{model.name}</span>
                          </div>
                          <Badge variant="outline">{model.provider}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm capitalize">{status?.status || 'Unknown'}</div>
                          {status?.responseTime && (
                            <div className="text-xs text-muted-foreground">
                              {status.responseTime}ms
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Actions</CardTitle>
                <CardDescription>
                  Control and monitoring actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => refreshModelStatus()}
                    className="w-full"
                  >
                    Refresh All Status
                  </Button>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => switchModel('deepseek-coder-6.7b')}
                      >
                        Switch to Local
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => switchModel('gemini-pro')}
                      >
                        Switch to Cloud
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => switchModel('hybrid-smart')}
                      >
                        Switch to Hybrid
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleTestModel(currentModel)}
                      >
                        Test Current
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Health Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Online Models:</span>
                        <div className="font-semibold text-green-600">{healthSummary.onlineModels}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Offline Models:</span>
                        <div className="font-semibold text-red-600">{healthSummary.offlineModels}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Error Models:</span>
                        <div className="font-semibold text-red-600">{healthSummary.errorModels}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Response:</span>
                        <div className="font-semibold">
                          {healthSummary.averageResponseTime > 0 ? `${Math.round(healthSummary.averageResponseTime)}ms` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}