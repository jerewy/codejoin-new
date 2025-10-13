"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Copy,
  CheckCircle,
  Code,
  MessageSquare,
  BookOpen,
  Zap,
  Clock,
  Brain,
  Cpu,
  Cloud,
  Loader2,
  Sparkles,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIPlaygroundProps {
  projectId?: string;
  userId?: string;
}

interface TestResult {
  model: string;
  response: string;
  responseTime: number;
  timestamp: Date;
  tokens?: number;
}

interface TestPrompt {
  id: string;
  category: string;
  title: string;
  prompt: string;
  expectedModel: "deepseek" | "gemini" | "auto";
  difficulty: "easy" | "medium" | "hard";
}

const testPrompts: TestPrompt[] = [
  {
    id: "1",
    category: "Code Generation",
    title: "React Component Generator",
    prompt: "Create a React component for a todo list with add, delete, and toggle complete functionality using TypeScript and Tailwind CSS.",
    expectedModel: "deepseek",
    difficulty: "medium"
  },
  {
    id: "2",
    category: "Debugging",
    title: "Bug Fix Challenge",
    prompt: "I have this async function that's causing a memory leak. Can you identify the issue and fix it?\n\n```javascript\nasync function processData(items) {\n  const results = [];\n  for (const item of items) {\n    const processed = await heavyProcessing(item);\n    results.push(processed);\n  }\n  return results;\n}\n```",
    expectedModel: "deepseek",
    difficulty: "hard"
  },
  {
    id: "3",
    category: "General Knowledge",
    title: "Architecture Patterns",
    prompt: "Explain the differences between microservices and monolithic architecture, including their pros, cons, and when to use each approach.",
    expectedModel: "gemini",
    difficulty: "medium"
  },
  {
    id: "4",
    category: "Code Review",
    title: "Code Quality Analysis",
    prompt: "Review this Python code and suggest improvements for performance, readability, and best practices:\n\n```python\ndef calculate_sum(numbers):\n    total = 0\n    for i in range(len(numbers)):\n        total += numbers[i]\n    return total\n```",
    expectedModel: "gemini",
    difficulty: "easy"
  },
  {
    id: "5",
    category: "System Design",
    title: "API Design",
    prompt: "Design a RESTful API for a chat application with users, rooms, and messages. Include endpoints, data models, and authentication strategy.",
    expectedModel: "auto",
    difficulty: "hard"
  },
  {
    id: "6",
    category: "Learning",
    title: "Concept Explanation",
    prompt: "Explain React hooks in simple terms with practical examples for useState, useEffect, and useCallback.",
    expectedModel: "gemini",
    difficulty: "easy"
  }
];

export default function AIPlayground({ projectId, userId }: AIPlaygroundProps) {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<"deepseek" | "gemini" | "auto">("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredPrompts = selectedCategory === "all"
    ? testPrompts
    : testPrompts.filter(p => p.category === selectedCategory);

  const runTest = async (prompt: string, model: "deepseek" | "gemini" | "auto" = "auto") => {
    setIsRunning(true);
    const startTime = Date.now();

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    const responseTime = Date.now() - startTime;
    const actualModel = model === "auto"
      ? (prompt.toLowerCase().includes("code") || prompt.toLowerCase().includes("function") ? "deepseek" : "gemini")
      : model;

    const mockResponse = actualModel === "deepseek"
      ? `// DeepSeek Coder Response\n\nHere's your solution:\n\n\`\`\`typescript\ninterface TodoItem {\n  id: string;\n  text: string;\n  completed: boolean;\n  createdAt: Date;\n}\n\nconst TodoList = () => {\n  const [todos, setTodos] = useState<TodoItem[]>([]);\n  const [input, setInput] = useState('');\n  \n  // Implementation details...\n};\n\`\`\`\n\nThis solution provides a complete, type-safe implementation with optimal performance.`
      : `I'll help you understand this concept in detail.\n\n## Key Points\n\n1. **Core Concept**: This is a fundamental pattern in modern development\n2. **Benefits**: Improved maintainability, better performance, enhanced developer experience\n3. **Use Cases**: Perfect for applications requiring real-time updates and efficient state management\n\n## Practical Application\n\nHere's how you would implement this in a real-world scenario...`;

    const newResult: TestResult = {
      model: actualModel,
      response: mockResponse,
      responseTime,
      timestamp: new Date(),
      tokens: Math.floor(Math.random() * 500) + 100
    };

    setResults(prev => [newResult, ...prev].slice(0, 10)); // Keep last 10 results
    setIsRunning(false);

    toast({
      title: "Test Complete",
      description: `${actualModel === "deepseek" ? "DeepSeek Coder" : "Gemini Pro"} responded in ${responseTime}ms`,
    });
  };

  const runPromptTest = (prompt: TestPrompt) => {
    const model = selectedModel === "auto" ? prompt.expectedModel : selectedModel;
    runTest(prompt.prompt, model);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const clearResults = () => {
    setResults([]);
    toast({
      title: "Cleared",
      description: "All test results have been cleared",
    });
  };

  // Auto-scroll to results
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results]);

  const getDifficultyColor = (difficulty: TestPrompt["difficulty"]) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    }
  };

  const getModelIcon = (model: string) => {
    return model === "deepseek"
      ? <Cpu className="h-4 w-4 text-green-600" />
      : <Cloud className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Live Testing Playground
          </CardTitle>
          <CardDescription>
            Test different AI models with various prompts and compare responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="model-select" className="text-sm font-medium">Model Selection</Label>
              <Select value={selectedModel} onValueChange={(value: any) => setSelectedModel(value)}>
                <SelectTrigger id="model-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Auto (Smart Selection)
                    </div>
                  </SelectItem>
                  <SelectItem value="deepseek">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-green-600" />
                      DeepSeek Coder (Local)
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-blue-600" />
                      Gemini Pro (Cloud)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-select" className="text-sm font-medium">Test Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Code Generation">Code Generation</SelectItem>
                  <SelectItem value="Debugging">Debugging</SelectItem>
                  <SelectItem value="General Knowledge">General Knowledge</SelectItem>
                  <SelectItem value="Code Review">Code Review</SelectItem>
                  <SelectItem value="System Design">System Design</SelectItem>
                  <SelectItem value="Learning">Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearResults}
                disabled={results.length === 0}
                className="w-full"
              >
                Clear Results
              </Button>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt" className="text-sm font-medium">Custom Prompt</Label>
            <div className="flex gap-2">
              <Textarea
                id="custom-prompt"
                placeholder="Enter your custom test prompt here..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="flex-1 min-h-[80px]"
              />
              <Button
                onClick={() => customPrompt && runTest(customPrompt, selectedModel)}
                disabled={!customPrompt.trim() || isRunning}
                className="self-end"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Test Prompts
          </CardTitle>
          <CardDescription>
            Click on any prompt to test it with the selected model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="p-4 rounded-lg border hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => runPromptTest(prompt)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-sm">{prompt.title}</h3>
                    <p className="text-xs text-muted-foreground">{prompt.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getDifficultyColor(prompt.difficulty)}`}>
                      {prompt.difficulty}
                    </Badge>
                    {getModelIcon(prompt.expectedModel)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {prompt.prompt.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Recent test responses and performance metrics
              </CardDescription>
            </div>
            {results.length > 0 && (
              <Badge variant="secondary">
                {results.length} results
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No test results yet. Run a test to see results here.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getModelIcon(result.model)}
                      <span className="font-medium">
                        {result.model === "deepseek" ? "DeepSeek Coder" : "Gemini Pro"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {result.responseTime}ms
                      </Badge>
                      {result.tokens && (
                        <Badge variant="secondary" className="text-xs">
                          {result.tokens} tokens
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(result.response, `result-${index}`)}
                      >
                        {copiedId === `result-${index}` ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {result.response}
                    </pre>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}