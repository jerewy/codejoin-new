"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Zap, FileText, AlertTriangle, CheckCircle } from "lucide-react"

export default function CodeAnalyzer() {
  const [code, setCode] = useState(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}`)

  const [analysis, setAnalysis] = useState({
    bugs: [
      {
        line: 4,
        severity: "warning",
        message: "Consider using array methods like reduce() for better readability",
        suggestion: "items.reduce((total, item) => total + item.price * item.quantity, 0)",
      },
    ],
    optimizations: [
      {
        type: "performance",
        message: "Use const instead of let for variables that don't change",
        impact: "Low",
      },
      {
        type: "readability",
        message: "Consider destructuring item properties",
        impact: "Medium",
      },
    ],
    metrics: {
      complexity: 2,
      maintainability: 85,
      performance: 78,
      security: 95,
    },
  })

  const analyzeCode = () => {
    // Simulate analysis
    console.log("Analyzing code...")
  }

  return (
    <div className="space-y-6">
      {/* Code Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your code here for analysis..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={analyzeCode} className="gap-2">
              <Zap className="h-4 w-4" />
              Analyze Code
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Load from Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bugs">
            Issues
            <Badge variant="destructive" className="ml-2 text-xs">
              {analysis.bugs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Code Quality</p>
                    <p className="text-2xl font-bold text-green-500">Good</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Issues Found</p>
                    <p className="text-2xl font-bold text-yellow-500">{analysis.bugs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Optimizations</p>
                    <p className="text-2xl font-bold text-blue-500">{analysis.optimizations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Complexity</p>
                    <p className="text-2xl font-bold text-purple-500">{analysis.metrics.complexity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your code is well-structured with room for improvement. Consider using modern JavaScript features like
                array methods and destructuring for better readability and performance.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4">
          {analysis.bugs.map((bug, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Line {bug.line}</Badge>
                      <Badge variant={bug.severity === "error" ? "destructive" : "secondary"}>{bug.severity}</Badge>
                    </div>
                    <p className="text-sm mb-2">{bug.message}</p>
                    {bug.suggestion && <div className="bg-muted p-3 rounded text-sm font-mono">{bug.suggestion}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          {analysis.optimizations.map((opt, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{opt.type}</Badge>
                      <Badge
                        variant={
                          opt.impact === "High" ? "destructive" : opt.impact === "Medium" ? "default" : "secondary"
                        }
                      >
                        {opt.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm">{opt.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Code Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Maintainability</span>
                    <span className="text-sm font-medium">{analysis.metrics.maintainability}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${analysis.metrics.maintainability}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Performance</span>
                    <span className="text-sm font-medium">{analysis.metrics.performance}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${analysis.metrics.performance}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Security</span>
                    <span className="text-sm font-medium">{analysis.metrics.security}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${analysis.metrics.security}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Use modern ES6+ features</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Add error handling</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Consider type checking</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Add unit tests</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
