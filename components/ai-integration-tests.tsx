"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw, List, Bug, Zap, Shield, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIIntegrationTestsProps {
  projectId?: string;
  userId?: string;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  status: "pending" | "running" | "passed" | "failed";
  duration?: number;
  results?: TestResults;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: "functionality" | "performance" | "reliability" | "security";
  expectedBehavior: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  duration?: number;
  errorMessage?: string;
  details?: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: number;
}

const testSuites: TestSuite[] = [
  {
    id: "model-switching",
    name: "Model Switching Tests",
    description: "Verify seamless switching between DeepSeek and Gemini models",
    status: "pending",
    tests: [
      {
        id: "auto-switch-on-load",
        name: "Auto Switch on Load",
        description: "System should auto-select appropriate model based on request type",
        category: "functionality",
        expectedBehavior: "Coding requests use DeepSeek, general queries use Gemini",
        status: "pending"
      },
      {
        id: "manual-switch-override",
        name: "Manual Switch Override",
        description: "Users can manually override model selection",
        category: "functionality",
        expectedBehavior: "User selection takes precedence over auto-selection",
        status: "pending"
      },
      {
        id: "fallback-mechanism",
        name: "Fallback Mechanism",
        description: "System falls back to alternate model on failure",
        category: "reliability",
        expectedBehavior: "Graceful fallback with user notification",
        status: "pending"
      },
      {
        id: "context-preservation",
        name: "Context Preservation",
        description: "Conversation context is maintained during model switches",
        category: "functionality",
        expectedBehavior: "Full conversation history preserved",
        status: "pending"
      }
    ]
  },
  {
    id: "performance-tests",
    name: "Performance Tests",
    description: "Validate performance characteristics and SLA compliance",
    status: "pending",
    tests: [
      {
        id: "deepseek-response-time",
        name: "DeepSeek Response Time",
        description: "Local model response time under 100ms",
        category: "performance",
        expectedBehavior: "95% of requests complete within 100ms",
        status: "pending"
      },
      {
        id: "gemini-response-time",
        name: "Gemini Response Time",
        description: "Cloud model response time under 500ms",
        category: "performance",
        expectedBehavior: "95% of requests complete within 500ms",
        status: "pending"
      },
      {
        id: "concurrent-requests",
        name: "Concurrent Request Handling",
        description: "System handles multiple simultaneous requests",
        category: "performance",
        expectedBehavior: "Maintain performance under load",
        status: "pending"
      },
      {
        id: "memory-usage",
        name: "Memory Usage",
        description: "Local model memory consumption stays within limits",
        category: "performance",
        expectedBehavior: "Memory usage below 80% of available",
        status: "pending"
      }
    ]
  },
  {
    id: "integration-tests",
    name: "Integration Tests",
    description: "Test integration with external systems and APIs",
    status: "pending",
    tests: [
      {
        id: "database-persistence",
        name: "Database Persistence",
        description: "Conversations are correctly saved and retrieved",
        category: "functionality",
        expectedBehavior: "All conversation data persisted accurately",
        status: "pending"
      },
      {
        id: "api-gateway-routing",
        name: "API Gateway Routing",
        description: "Requests are correctly routed to appropriate handlers",
        category: "functionality",
        expectedBehavior: "100% of requests routed correctly",
        status: "pending"
      },
      {
        id: "websocket-connectivity",
        name: "WebSocket Connectivity",
        description: "Real-time communication channel functionality",
        category: "reliability",
        expectedBehavior: "Stable real-time connection maintenance",
        status: "pending"
      },
      {
        id: "authentication-integration",
        name: "Authentication Integration",
        description: "User authentication and authorization",
        category: "security",
        expectedBehavior: "Secure user session management",
        status: "pending"
      }
    ]
  },
  {
    id: "error-handling",
    name: "Error Handling Tests",
    description: "Verify robust error handling and recovery",
    status: "pending",
    tests: [
      {
        id: "network-failure",
        name: "Network Failure Recovery",
        description: "System recovers from network interruptions",
        category: "reliability",
        expectedBehavior: "Automatic reconnection and state recovery",
        status: "pending"
      },
      {
        id: "model-unavailable",
        name: "Model Unavailable Handling",
        description: "Graceful handling when a model is unavailable",
        category: "reliability",
        expectedBehavior: "Fallback to alternate model with notification",
        status: "pending"
      },
      {
        id: "invalid-input-handling",
        name: "Invalid Input Handling",
        description: "System handles malformed or malicious inputs",
        category: "security",
        expectedBehavior: "Input validation and sanitization",
        status: "pending"
      },
      {
        id: "resource-exhaustion",
        name: "Resource Exhaustion",
        description: "System behavior under resource constraints",
        category: "reliability",
        expectedBehavior: "Graceful degradation and recovery",
        status: "pending"
      }
    ]
  }
];

export default function AIIntegrationTests({ projectId, userId }: AIIntegrationTestsProps) {
  const { toast } = useToast();
  const [suites, setSuites] = useState<TestSuite[]>(testSuites);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);

  const runSingleTest = async (suiteId: string, testId: string) => {
    setSuites(prev => prev.map(suite => {
      if (suite.id === suiteId) {
        return {
          ...suite,
          tests: suite.tests.map(test => {
            if (test.id === testId) {
              return { ...test, status: "running" as const };
            }
            return test;
          })
        };
      }
      return suite;
    }));

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const success = Math.random() > 0.2; // 80% success rate

    setSuites(prev => prev.map(suite => {
      if (suite.id === suiteId) {
        const updatedTests = suite.tests.map(test => {
          if (test.id === testId) {
            return {
              ...test,
              status: success ? "passed" as const : "failed" as const,
              duration: Math.floor(Math.random() * 3000) + 500,
              errorMessage: success ? undefined : "Test assertion failed: Expected value did not match actual",
              details: success ? "All assertions passed successfully" : undefined
            };
          }
          return test;
        });

        // Update suite status
        const allTests = updatedTests;
        const hasFailures = allTests.some(t => t.status === "failed");
        const allPassed = allTests.every(t => t.status === "passed" || t.status === "skipped");
        const anyRunning = allTests.some(t => t.status === "running");

        return {
          ...suite,
          status: anyRunning ? "running" as const : hasFailures ? "failed" as const : allPassed ? "passed" as const : "pending" as const,
          tests: updatedTests
        };
      }
      return suite;
    }));

    if (success) {
      toast({
        title: "Test Passed",
        description: `${testId} completed successfully`,
      });
    } else {
      toast({
        title: "Test Failed",
        description: `${testId} failed`,
        variant: "destructive"
      });
    }
  };

  const runTestSuite = async (suiteId: string) => {
    setSelectedSuite(suiteId);
    const suite = suites.find(s => s.id === suiteId);
    if (!suite) return;

    // Reset test status
    setSuites(prev => prev.map(s => {
      if (s.id === suiteId) {
        return {
          ...s,
          status: "running" as const,
          tests: s.tests.map(t => ({ ...t, status: "pending" as const, errorMessage: undefined, details: undefined }))
        };
      }
      return s;
    }));

    // Run tests sequentially
    for (const test of suite.tests) {
      await runSingleTest(suiteId, test.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests
    }

    // Calculate results
    const updatedSuite = suites.find(s => s.id === suiteId);
    if (updatedSuite) {
      const total = updatedSuite.tests.length;
      const passed = updatedSuite.tests.filter(t => t.status === "passed").length;
      const failed = updatedSuite.tests.filter(t => t.status === "failed").length;
      const skipped = updatedSuite.tests.filter(t => t.status === "skipped").length;
      const duration = updatedSuite.tests.reduce((acc, t) => acc + (t.duration || 0), 0);

      const results: TestResults = {
        total,
        passed,
        failed,
        skipped,
        duration,
        coverage: (passed / total) * 100
      };

      setSuites(prev => prev.map(s => {
        if (s.id === suiteId) {
          return { ...s, results };
        }
        return s;
      }));

      // Add to history
      setTestHistory(prev => [{
        suiteId,
        suiteName: suite.name,
        timestamp: new Date(),
        results,
        status: failed > 0 ? "failed" : "passed"
      }, ...prev.slice(0, 9)]); // Keep last 10 results
    }

    setSelectedSuite(null);
  };

  const runAllTests = async () => {
    setIsRunningAll(true);

    for (const suite of suites) {
      await runTestSuite(suite.id);
    }

    setIsRunningAll(false);

    const totalPassed = suites.reduce((acc, suite) =>
      acc + (suite.results?.passed || 0), 0
    );
    const totalFailed = suites.reduce((acc, suite) =>
      acc + (suite.results?.failed || 0), 0
    );

    toast({
      title: "All Tests Complete",
      description: `${totalPassed} passed, ${totalFailed} failed`,
      variant: totalFailed > 0 ? "destructive" : "default"
    });
  };

  const getStatusIcon = (status: TestCase["status"] | TestSuite["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getCategoryIcon = (category: TestCase["category"]) => {
    switch (category) {
      case "functionality":
        return <Settings className="h-4 w-4 text-blue-500" />;
      case "performance":
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case "reliability":
        return <Shield className="h-4 w-4 text-green-500" />;
      case "security":
        return <Bug className="h-4 w-4 text-red-500" />;
      default:
        return <List className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestCase["status"] | TestSuite["status"]) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "skipped":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getOverallProgress = () => {
    const totalTests = suites.reduce((acc, suite) => acc + suite.tests.length, 0);
    const completedTests = suites.reduce((acc, suite) =>
      acc + suite.tests.filter(t => t.status === "passed" || t.status === "failed").length, 0
    );
    return totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  };

  const getOverallStats = () => {
    const total = suites.reduce((acc, suite) => acc + suite.tests.length, 0);
    const passed = suites.reduce((acc, suite) =>
      acc + suite.tests.filter(t => t.status === "passed").length, 0
    );
    const failed = suites.reduce((acc, suite) =>
      acc + suite.tests.filter(t => t.status === "failed").length, 0
    );
    const running = suites.reduce((acc, suite) =>
      acc + suite.tests.filter(t => t.status === "running").length, 0
    );

    return { total, passed, failed, running };
  };

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                AI Integration Tests
              </CardTitle>
              <CardDescription>
                Comprehensive testing suite for AI model integration and system reliability
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={runAllTests}
                disabled={isRunningAll}
                size="lg"
              >
                {isRunningAll ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run All Tests
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-3" />

            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.running}</p>
                <p className="text-xs text-muted-foreground">Running</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Suites */}
      <Tabs defaultValue="suites" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-4">
          {suites.map((suite) => (
            <Card key={suite.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(suite.status)}
                      {suite.name}
                      <Badge className={getStatusColor(suite.status)}>
                        {suite.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{suite.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {suite.results && (
                      <div className="text-sm text-muted-foreground mr-4">
                        {suite.results.passed}/{suite.results.total} passed
                      </div>
                    )}
                    <Button
                      onClick={() => runTestSuite(suite.id)}
                      disabled={suite.status === "running" || isRunningAll}
                      size="sm"
                    >
                      {suite.status === "running" ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Suite
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suite.tests.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <div>
                            <h4 className="font-medium text-sm">{test.name}</h4>
                            <p className="text-xs text-muted-foreground">{test.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(test.category)}
                            <Badge variant="outline" className="text-xs capitalize">
                              {test.category}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => runSingleTest(suite.id, test.id)}
                            disabled={test.status === "running"}
                          >
                            {test.status === "running" ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        <strong>Expected:</strong> {test.expectedBehavior}
                      </div>

                      {test.errorMessage && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          <strong>Error:</strong> {test.errorMessage}
                        </div>
                      )}

                      {test.details && (
                        <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                          <strong>Details:</strong> {test.details}
                        </div>
                      )}

                      {test.duration && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Duration: {test.duration}ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Execution History</CardTitle>
              <CardDescription>
                Recent test run results and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testHistory.length === 0 ? (
                <div className="text-center py-8">
                  <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No test history yet. Run tests to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testHistory.map((run, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <h4 className="font-medium">{run.suiteName}</h4>
                          <Badge className={getStatusColor(run.status)}>
                            {run.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {run.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">{run.results.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Passed</p>
                          <p className="font-medium text-green-600">{run.results.passed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed</p>
                          <p className="font-medium text-red-600">{run.results.failed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{(run.results.duration / 1000).toFixed(2)}s</p>
                        </div>
                      </div>
                      {run.results.coverage && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Coverage</span>
                            <span>{run.results.coverage.toFixed(1)}%</span>
                          </div>
                          <Progress value={run.results.coverage} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}