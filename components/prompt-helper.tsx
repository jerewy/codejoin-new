"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Code,
  Bug,
  Lightbulb,
  Zap,
  FileText,
  Wrench,
  BookOpen,
  Rocket
} from "lucide-react";

interface PromptHelperProps {
  onPromptSelect: (prompt: string) => void;
}

const prompts = [
  {
    icon: Code,
    title: "Generate Code",
    prompts: [
      "Create a React component for a user profile card",
      "Generate a Python function to fetch data from an API",
      "Write a SQL query to get users and their orders",
      "Create a CSS flexbox layout for a dashboard",
    ],
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Bug,
    title: "Debug Code",
    prompts: [
      "Help me fix this JavaScript error: Cannot read property of undefined",
      "My React component is not re-rendering when state changes",
      "Debug this slow SQL query performance issue",
      "Fix this CSS alignment problem in my layout",
    ],
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    icon: Lightbulb,
    title: "Explain Code",
    prompts: [
      "Explain how React hooks work with examples",
      "What is the difference between async/await and promises?",
      "How does CSS Grid work compared to Flexbox?",
      "Explain this complex algorithm step by step",
    ],
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Zap,
    title: "Optimize Code",
    prompts: [
      "Optimize this React component for better performance",
      "Improve the performance of this database query",
      "Refactor this code to be more maintainable",
      "Suggest best practices for this code structure",
    ],
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: FileText,
    title: "Add Comments",
    prompts: [
      "Add comprehensive comments to this function",
      "Write documentation for this API endpoint",
      "Explain what this code block does with comments",
      "Add JSDoc comments to this JavaScript file",
    ],
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Wrench,
    title: "Refactor Code",
    prompts: [
      "Refactor this function to be more readable",
      "Convert this class component to a functional component",
      "Simplify this complex conditional logic",
      "Break down this large function into smaller functions",
    ],
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

export default function PromptHelper({ onPromptSelect }: PromptHelperProps) {
  return (
    <div className="space-y-3">
      {/* Compact quick actions - text only */}
      <div className="flex flex-wrap gap-1">
        {[
          "Explain code",
          "Debug issue",
          "Optimize",
          "Generate tests",
          "Refactor",
          "Add comments"
        ].map((suggestion) => (
          <Button
            key={suggestion}
            variant="ghost"
            size="sm"
            onClick={() => onPromptSelect(suggestion)}
            className="text-xs h-7 px-2 hover:bg-muted/50"
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {/* Category-based prompts - compact, no icons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {prompts.map((category) => (
          <Card
            key={category.title}
            className={`p-2 cursor-pointer hover:shadow-sm transition-all duration-200 border hover:border-primary/30 ${category.bgColor}`}
            onClick={() => {
              const randomPrompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
              onPromptSelect(randomPrompt);
            }}
          >
            <div className="text-center">
              <span className="text-xs font-medium">{category.title}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}