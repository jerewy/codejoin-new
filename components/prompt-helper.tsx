"use client";

import { Button } from "@/components/ui/button";

interface PromptHelperProps {
  onPromptSelect: (prompt: string) => void;
}

export default function PromptHelper({ onPromptSelect }: PromptHelperProps) {
  const quickActions = [
    "Explain code",
    "Debug issue",
    "Optimize",
    "Generate test",
    "Refactor",
    "Add comments"
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {quickActions.map((action) => (
        <Button
          key={action}
          variant="outline"
          size="sm"
          onClick={() => onPromptSelect(action)}
          className="text-xs h-8 px-3 hover:bg-primary/10 hover:border-primary/30 transition-colors"
        >
          {action}
        </Button>
      ))}
    </div>
  );
}