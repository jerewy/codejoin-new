"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Server,
  Cloud,
  Zap,
  Code,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cpu,
  HardDrive,
  Wifi,
  Settings,
  ArrowRight,
  Star,
  Shield,
  Gauge
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIModelShowcaseProps {
  projectId?: string;
  userId?: string;
}

interface ModelStatus {
  name: string;
  type: "local" | "cloud";
  status: "online" | "offline" | "loading";
  responseTime: number;
  capabilities: string[];
  lastUsed: string;
  accuracy: number;
  loadPercentage?: number;
}

export default function AIModelShowcase({ projectId, userId }: AIModelShowcaseProps) {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<"deepseek" | "gemini">("deepseek");
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [models, setModels] = useState<Record<string, ModelStatus>>({
    deepseek: {
      name: "DeepSeek Coder",
      type: "local",
      status: "online",
      responseTime: 45,
      capabilities: ["Code Generation", "Debugging", "Documentation", "Refactoring"],
      lastUsed: "2 minutes ago",
      accuracy: 94,
      loadPercentage: 23
    },
    gemini: {
      name: "Gemini Pro",
      type: "cloud",
      status: "online",
      responseTime: 230,
      capabilities: ["General Knowledge", "Code Review", "Architecture", "Analysis"],
      lastUsed: "5 minutes ago",
      accuracy: 96
    }
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setModels(prev => ({
        ...prev,
        deepseek: {
          ...prev.deepseek,
          responseTime: Math.max(30, Math.min(80, prev.deepseek.responseTime + (Math.random() - 0.5) * 10)),
          loadPercentage: Math.max(10, Math.min(90, (prev.deepseek.loadPercentage || 0) + (Math.random() - 0.5) * 15))
        },
        gemini: {
          ...prev.gemini,
          responseTime: Math.max(180, Math.min(350, prev.gemini.responseTime + (Math.random() - 0.5) * 30))
        }
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const runModelTest = async (modelName: "deepseek" | "gemini") => {
    setIsTestRunning(true);
    setSelectedModel(modelName);

    // Simulate model testing
    setModels(prev => ({
      ...prev,
      [modelName]: { ...prev[modelName], status: "loading" }
    }));

    await new Promise(resolve => setTimeout(resolve, 2000));

    setModels(prev => ({
      ...prev,
      [modelName]: {
        ...prev[modelName],
        status: "online",
        lastUsed: "Just now",
        responseTime: modelName === "deepseek" ? 42 : 215
      }
    }));

    setIsTestRunning(false);

    toast({
      title: "Model Test Complete",
      description: `${models[modelName].name} is responding normally with ${models[modelName].responseTime}ms response time.`,
    });
  };

  const getStatusIcon = (status: ModelStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "offline":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "loading":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getModelIcon = (type: ModelStatus["type"]) => {
    return type === "local" ?
      <Server className="h-5 w-5 text-green-600" /> :
      <Cloud className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Model Selection & Status
          </CardTitle>
          <CardDescription>
            Switch between Local DeepSeek Coder and Cloud Gemini Pro models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(models).map(([key, model]) => (
              <div
                key={key}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedModel === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedModel(key as "deepseek" | "gemini")}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getModelIcon(model.type)}
                    <div>
                      <h3 className="font-semibold">{model.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{model.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(model.status)}
                    {selectedModel === key && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium">{model.responseTime}ms</span>
                  </div>

                  {model.loadPercentage && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">System Load</span>
                        <span className="font-medium">{model.loadPercentage}%</span>
                      </div>
                      <Progress value={model.loadPercentage} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{model.accuracy}%</span>
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Used</span>
                    <span className="text-xs">{model.lastUsed}</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {model.capabilities.slice(0, 3).map((cap, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                    {model.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{model.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Test Button */}
                <Button
                  size="sm"
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    runModelTest(key as "deepseek" | "gemini");
                  }}
                  disabled={isTestRunning}
                >
                  {isTestRunning && selectedModel === key ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Model
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Model Comparison
          </CardTitle>
          <CardDescription>
            Compare performance metrics and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Speed Comparison */}
            <div className="text-center">
              <div className="mb-3">
                <Zap className="h-8 w-8 mx-auto text-yellow-500" />
              </div>
              <h3 className="font-semibold mb-2">Speed</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>DeepSeek:</span>
                  <span className="font-medium text-green-600">{models.deepseek.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Gemini:</span>
                  <span className="font-medium text-blue-600">{models.gemini.responseTime}ms</span>
                </div>
              </div>
            </div>

            {/* Accuracy Comparison */}
            <div className="text-center">
              <div className="mb-3">
                <Target className="h-8 w-8 mx-auto text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">Accuracy</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>DeepSeek:</span>
                  <span className="font-medium text-green-600">{models.deepseek.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Gemini:</span>
                  <span className="font-medium text-blue-600">{models.gemini.accuracy}%</span>
                </div>
              </div>
            </div>

            {/* Specialization */}
            <div className="text-center">
              <div className="mb-3">
                <Code className="h-8 w-8 mx-auto text-indigo-500" />
              </div>
              <h3 className="font-semibold mb-2">Best For</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-green-600 font-medium">DeepSeek:</span>
                  <p className="text-xs text-muted-foreground">Code & Development</p>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Gemini:</span>
                  <p className="text-xs text-muted-foreground">General Knowledge</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Cpu className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Local Processing</p>
                <p className="text-xs text-muted-foreground">No data leaves your system</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Wifi className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Cloud Backup</p>
                <p className="text-xs text-muted-foreground">Always available fallback</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Settings className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-sm">Smart Switching</p>
                <p className="text-xs text-muted-foreground">Automatic fallback</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-sm">Performance Monitoring</p>
                <p className="text-xs text-muted-foreground">Real-time metrics</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}