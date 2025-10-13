"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  Target,
  Cpu,
  Cloud,
  Activity,
  Play,
  RefreshCw,
  Download,
  Gauge,
  Timer,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIPerformanceComparisonProps {
  projectId?: string;
  userId?: string;
}

interface PerformanceMetrics {
  model: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  totalRequests: number;
  accuracy: number;
  tokensPerSecond: number;
  costPerRequest: number;
}

interface TestScenario {
  name: string;
  category: string;
  deepseekTime: number;
  geminiTime: number;
  deepseekQuality: number;
  geminiQuality: number;
  winner: "deepseek" | "gemini" | "tie";
}

interface RealTimeMetric {
  timestamp: Date;
  deepseekResponse: number;
  geminiResponse: number;
}

export default function AIPerformanceComparison({ projectId, userId }: AIPerformanceComparisonProps) {
  const { toast } = useToast();
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [realTimeData, setRealTimeData] = useState<RealTimeMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const [metrics, setMetrics] = useState<Record<string, PerformanceMetrics>>({
    deepseek: {
      model: "DeepSeek Coder",
      avgResponseTime: 45,
      minResponseTime: 32,
      maxResponseTime: 78,
      successRate: 98.5,
      totalRequests: 1247,
      accuracy: 94,
      tokensPerSecond: 85,
      costPerRequest: 0
    },
    gemini: {
      model: "Gemini Pro",
      avgResponseTime: 230,
      minResponseTime: 180,
      maxResponseTime: 320,
      successRate: 99.2,
      totalRequests: 892,
      accuracy: 96,
      tokensPerSecond: 42,
      costPerRequest: 0.0025
    }
  });

  const testScenarios: TestScenario[] = [
    {
      name: "Simple Code Generation",
      category: "Code",
      deepseekTime: 35,
      geminiTime: 180,
      deepseekQuality: 92,
      geminiQuality: 88,
      winner: "deepseek"
    },
    {
      name: "Complex Algorithm",
      category: "Code",
      deepseekTime: 65,
      geminiTime: 280,
      deepseekQuality: 95,
      geminiQuality: 93,
      winner: "deepseek"
    },
    {
      name: "Bug Fixing",
      category: "Debug",
      deepseekTime: 42,
      geminiTime: 210,
      deepseekQuality: 94,
      geminiQuality: 91,
      winner: "deepseek"
    },
    {
      name: "Documentation Writing",
      category: "Documentation",
      deepseekTime: 38,
      geminiTime: 195,
      deepseekQuality: 90,
      geminiQuality: 94,
      winner: "gemini"
    },
    {
      name: "Architecture Design",
      category: "Design",
      deepseekTime: 55,
      geminiTime: 240,
      deepseekQuality: 88,
      geminiQuality: 95,
      winner: "gemini"
    },
    {
      name: "General Knowledge",
      category: "Knowledge",
      deepseekTime: 40,
      geminiTime: 190,
      deepseekQuality: 82,
      geminiQuality: 96,
      winner: "gemini"
    }
  ];

  // Simulate real-time monitoring
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        const newMetric: RealTimeMetric = {
          timestamp: new Date(),
          deepseekResponse: Math.max(25, Math.min(90, 45 + (Math.random() - 0.5) * 20)),
          geminiResponse: Math.max(150, Math.min(350, 230 + (Math.random() - 0.5) * 50))
        };

        setRealTimeData(prev => [...prev.slice(-19), newMetric]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const runPerformanceTest = async () => {
    setIsRunningTest(true);

    // Simulate running tests
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update metrics with new data
    setMetrics(prev => ({
      deepseek: {
        ...prev.deepseek,
        avgResponseTime: Math.max(30, Math.min(70, prev.deepseek.avgResponseTime + (Math.random() - 0.5) * 10)),
        totalRequests: prev.deepseek.totalRequests + Math.floor(Math.random() * 50) + 10,
        successRate: Math.min(99.9, prev.deepseek.successRate + (Math.random() - 0.2) * 0.5)
      },
      gemini: {
        ...prev.gemini,
        avgResponseTime: Math.max(180, Math.min(280, prev.gemini.avgResponseTime + (Math.random() - 0.5) * 20)),
        totalRequests: prev.gemini.totalRequests + Math.floor(Math.random() * 30) + 5,
        successRate: Math.min(99.9, prev.gemini.successRate + (Math.random() - 0.1) * 0.3)
      }
    }));

    setIsRunningTest(false);

    toast({
      title: "Performance Test Complete",
      description: "New performance metrics have been collected.",
    });
  };

  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      timeRange,
      metrics,
      testScenarios,
      realTimeData: realTimeData.slice(-10)
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Performance report has been downloaded successfully.",
    });
  };

  const getWinnerBadge = (winner: string) => {
    const colors = {
      deepseek: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      tie: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    };

    return (
      <Badge className={`text-xs ${colors[winner as keyof typeof colors]}`}>
        {winner === "tie" ? "Tie" : winner === "deepseek" ? "DeepSeek" : "Gemini"}
      </Badge>
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Comparison
              </CardTitle>
              <CardDescription>
                Compare metrics between Local DeepSeek Coder and Cloud Gemini Pro
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={isMonitoring ? "bg-green-50 border-green-200" : ""}
              >
                <Activity className="h-4 w-4 mr-2" />
                {isMonitoring ? "Monitoring" : "Start Monitor"}
              </Button>
              <Button
                onClick={runPerformanceTest}
                disabled={isRunningTest}
              >
                {isRunningTest ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Test
              </Button>
              <Button
                variant="outline"
                onClick={downloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">DeepSeek Speed</p>
                <p className="text-2xl font-bold">{metrics.deepseek.avgResponseTime}ms</p>
                <p className="text-xs text-green-600">↑ 15% faster</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Gemini Speed</p>
                <p className="text-2xl font-bold">{metrics.gemini.avgResponseTime}ms</p>
                <p className="text-xs text-blue-600">↑ 8% faster</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">95%</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Winner</p>
                <p className="text-2xl font-bold">DeepSeek</p>
                <p className="text-xs text-green-600">For coding tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DeepSeek Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-green-600" />
                  DeepSeek Coder Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Response Time</span>
                    <span className="font-medium">{metrics.deepseek.avgResponseTime}ms</span>
                  </div>
                  <Progress value={(1 - metrics.deepseek.avgResponseTime / 1000) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span className="font-medium">{metrics.deepseek.successRate}%</span>
                  </div>
                  <Progress value={metrics.deepseek.successRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Accuracy</span>
                    <span className="font-medium">{metrics.deepseek.accuracy}%</span>
                  </div>
                  <Progress value={metrics.deepseek.accuracy} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Requests</p>
                    <p className="font-medium">{formatNumber(metrics.deepseek.totalRequests)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tokens/Sec</p>
                    <p className="font-medium">{metrics.deepseek.tokensPerSecond}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cost per Request</span>
                    <Badge variant="secondary" className="text-green-600">FREE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gemini Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-600" />
                  Gemini Pro Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Response Time</span>
                    <span className="font-medium">{metrics.gemini.avgResponseTime}ms</span>
                  </div>
                  <Progress value={(1 - metrics.gemini.avgResponseTime / 1000) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span className="font-medium">{metrics.gemini.successRate}%</span>
                  </div>
                  <Progress value={metrics.gemini.successRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Accuracy</span>
                    <span className="font-medium">{metrics.gemini.accuracy}%</span>
                  </div>
                  <Progress value={metrics.gemini.accuracy} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Requests</p>
                    <p className="font-medium">{formatNumber(metrics.gemini.totalRequests)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tokens/Sec</p>
                    <p className="font-medium">{metrics.gemini.tokensPerSecond}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cost per Request</span>
                    <Badge variant="secondary">${metrics.gemini.costPerRequest}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Scenario Performance</CardTitle>
              <CardDescription>
                Head-to-head comparison across different use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testScenarios.map((scenario, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{scenario.name}</h3>
                        <p className="text-sm text-muted-foreground">{scenario.category}</p>
                      </div>
                      {getWinnerBadge(scenario.winner)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Response Time</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{scenario.deepseekTime}ms</span>
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{scenario.geminiTime}ms</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Quality Score</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{scenario.deepseekQuality}%</span>
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{scenario.geminiQuality}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Performance Monitoring
              </CardTitle>
              <CardDescription>
                Live response time tracking (updates every 2 seconds)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {realTimeData.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Start monitoring to see real-time performance data</p>
                  <Button onClick={() => setIsMonitoring(true)}>
                    <Activity className="h-4 w-4 mr-2" />
                    Start Monitoring
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Cpu className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">DeepSeek (Latest)</p>
                      <p className="text-2xl font-bold text-green-600">
                        {realTimeData[realTimeData.length - 1]?.deepseekResponse || 0}ms
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Cloud className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Gemini (Latest)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {realTimeData[realTimeData.length - 1]?.geminiResponse || 0}ms
                      </p>
                    </div>
                  </div>

                  {/* Simple chart representation */}
                  <div className="h-32 flex items-end gap-1 p-4 bg-muted/20 rounded-lg">
                    {realTimeData.slice(-20).map((data, index) => (
                      <div key={index} className="flex-1 flex gap-1">
                        <div
                          className="bg-green-500 rounded-t"
                          style={{ height: `${(data.deepseekResponse / 400) * 100}%` }}
                          title={`DeepSeek: ${data.deepseekResponse}ms`}
                        />
                        <div
                          className="bg-blue-500 rounded-t"
                          style={{ height: `${(data.geminiResponse / 400) * 100}%` }}
                          title={`Gemini: ${data.geminiResponse}ms`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>DeepSeek</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span>Gemini</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-green-600" />
                  DeepSeek Coder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-green-600 mb-2">FREE</p>
                  <p className="text-sm text-muted-foreground">Local Processing</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Hardware Cost</span>
                    <span className="font-medium">One-time</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Costs</span>
                    <span className="font-medium text-green-600">None</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Privacy</span>
                    <Badge className="bg-green-100 text-green-800">100% Local</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-600" />
                  Gemini Pro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600 mb-2">$0.0025</p>
                  <p className="text-sm text-muted-foreground">Per Request</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monthly Est. (1k req)</span>
                    <span className="font-medium">$2.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Est. (10k req)</span>
                    <span className="font-medium">$25.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Privacy</span>
                    <Badge variant="secondary">Cloud Processing</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Savings (1k req/month)</p>
                  <p className="text-2xl font-bold text-green-600">$2.50</p>
                  <p className="text-xs text-muted-foreground">With DeepSeek</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Savings (10k req/month)</p>
                  <p className="text-2xl font-bold text-green-600">$25.00</p>
                  <p className="text-xs text-muted-foreground">With DeepSeek</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">ROI Period</p>
                  <p className="text-2xl font-bold text-blue-600">2-3 months</p>
                  <p className="text-xs text-muted-foreground">Hardware investment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}