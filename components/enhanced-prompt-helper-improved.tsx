"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  BookOpen,
  Bug,
  Shield,
  TestTube,
  Wrench,
  FileText,
  Building2,
  Lightbulb
} from "lucide-react";

interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  icon: string;
  description: string;
  template: string;
  examples?: string[];
  color: string;
}

interface PromptHelperProps {
  onPromptSelect: (prompt: string) => void;
  onPromptSend?: (prompt: string) => void;
  className?: string;
}

const promptTemplates: PromptTemplate[] = [
  {
    id: "explain-code",
    category: "Code Understanding",
    title: "Explain Code",
    icon: "📖",
    description: "Get detailed explanation of code functionality",
    template: `You are a senior software engineer and educator. I need you to explain this code thoroughly:

[CODE_HERE]

Please provide:
1. Overall purpose and functionality
2. Step-by-step breakdown of the logic
3. Key concepts and patterns used
4. Potential improvements or best practices
5. Common pitfalls to avoid

Format your response clearly with headings and bullet points for easy understanding.`,
    examples: ["Explain this React component", "What does this algorithm do?", "Break down this function"],
    color: "blue"
  },
  {
    id: "debug-issue",
    category: "Debugging",
    title: "Debug Issue",
    icon: "🐛",
    description: "Help identify and fix bugs in code",
    template: `You are an expert debugging specialist. I'm encountering an issue with this code:

[CODE_HERE]

The problem I'm facing is:
[DESCRIBE_ISSUE_HERE]

Error messages (if any):
[ERROR_MESSAGES_HERE]

Expected behavior:
[EXPECTED_BEHAVIOR]

Please help me:
1. Identify the root cause of the issue
2. Explain why it's happening
3. Provide a step-by-step solution
4. Suggest preventive measures for similar issues
5. Recommend debugging tools or techniques for this type of problem

Be thorough and provide code examples for your solutions.`,
    examples: ["Fix this runtime error", "Why isn't my code working?", "Help debug this logic"],
    color: "red"
  },
  {
    id: "optimize",
    category: "Performance",
    title: "Optimize Code",
    icon: "⚡",
    description: "Improve code performance and efficiency",
    template: `You are a performance optimization expert. Please review this code for optimization opportunities:

[CODE_HERE]

Current performance concerns:
[PERFORMANCE_ISSUES_HERE]

Please analyze and provide:
1. Performance bottlenecks identification
2. Time and space complexity analysis
3. Specific optimization strategies
4. Before/after code comparisons
5. Benchmark suggestions
6. Trade-offs between readability and performance
7. Long-term maintainability considerations

Focus on practical optimizations that provide meaningful improvements without sacrificing code clarity.`,
    examples: ["Make this faster", "Optimize memory usage", "Improve algorithm efficiency"],
    color: "yellow"
  },
  {
    id: "generate-test",
    category: "Testing",
    title: "Generate Tests",
    icon: "🧪",
    description: "Create comprehensive test cases",
    template: `You are a test automation specialist. I need you to create comprehensive tests for this code:

[CODE_HERE]

Please generate:

**Unit Tests:**
- Test cases for all functions/methods
- Edge cases and boundary conditions
- Error handling scenarios
- Input validation tests

**Integration Tests:**
- Component interaction tests
- API integration tests
- Database interaction tests

**Test Structure:**
- Clear test descriptions
- Arrange-Act-Assert pattern
- Proper setup and teardown
- Mock implementations where needed

**Coverage Goals:**
- Aim for >90% code coverage
- Test all branches and conditions
- Include performance tests where relevant

Provide the tests in the appropriate framework (Jest, Mocha, etc.) with detailed comments.`,
    examples: ["Write tests for this function", "Create unit tests", "Test this API endpoint"],
    color: "green"
  },
  {
    id: "refactor",
    category: "Code Quality",
    title: "Refactor Code",
    icon: "🔧",
    description: "Improve code structure and maintainability",
    template: `You are a code quality and architecture expert. Please help refactor this code:

[CODE_HERE]

Areas of concern:
[SPECIFIC_CONCERNS_HERE]

Please provide:

**Structural Improvements:**
- Better separation of concerns
- Improved naming conventions
- Enhanced readability
- Reduced complexity

**Design Patterns:**
- Suggest appropriate design patterns
- SOLID principles application
- Code organization improvements
- Dependency injection opportunities

**Best Practices:**
- Language-specific conventions
- Industry standards
- Security considerations
- Performance implications

**Step-by-step Refactoring Plan:**
1. Identify code smells
2. Prioritize changes
3. Implement incrementally
4. Validate each change
5. Update documentation

Provide before/after comparisons and explain the benefits of each change.`,
    examples: ["Clean up this code", "Improve structure", "Refactor for maintainability"],
    color: "purple"
  },
  {
    id: "add-comments",
    category: "Documentation",
    title: "Add Comments",
    icon: "📝",
    description: "Enhance code with proper documentation",
    template: `You are a technical documentation specialist. Please add comprehensive documentation to this code:

[CODE_HERE]

Documentation requirements:
[DOC_REQUIREMENTS_HERE]

Please provide:

**Code Comments:**
- Inline comments for complex logic
- Function/method documentation
- Parameter and return value descriptions
- Usage examples in comments

**Documentation Standards:**
- Follow language-specific conventions (JSDoc, docstrings, etc.)
- Include type information
- Add examples and edge cases
- Document assumptions and constraints

**README/External Docs:**
- High-level overview
- Installation and setup instructions
- Usage examples
- API documentation
- Troubleshooting guide

**Best Practices:**
- Comment why, not what
- Keep comments up-to-date
- Use clear, concise language
- Include code examples

Focus on making the code self-documenting where possible, with comments adding value beyond the obvious.`,
    examples: ["Document this function", "Add code comments", "Create documentation"],
    color: "indigo"
  },
  {
    id: "design-pattern",
    category: "Architecture",
    title: "Design Patterns",
    icon: "🏗️",
    description: "Apply appropriate design patterns",
    template: `You are a software architecture expert. Help me implement proper design patterns for this code:

[CODE_HERE]

Current architectural concerns:
[ARCHITECTURAL_CONCERNS_HERE]

Please analyze and suggest:

**Pattern Identification:**
- Which design patterns would be most beneficial
- Why these patterns fit the use case
- How they address current issues

**Implementation Guidance:**
- Step-by-step implementation
- Class/interface structure
- Relationship between components
- Pattern-specific best practices

**Common Patterns to Consider:**
- Creational: Factory, Builder, Singleton, Prototype
- Structural: Adapter, Decorator, Facade, Proxy, Composite
- Behavioral: Observer, Strategy, Command, Iterator, Template

**Refactoring Strategy:**
- Incremental implementation approach
- Backward compatibility considerations
- Testing strategy during refactoring
- Performance implications

Provide concrete code examples showing the before/after implementation of recommended patterns.`,
    examples: ["Apply design patterns", "Improve architecture", "Implement SOLID principles"],
    color: "pink"
  },
  {
    id: "security-review",
    category: "Security",
    title: "Security Review",
    icon: "🔒",
    description: "Identify and fix security vulnerabilities",
    template: `You are a cybersecurity expert specializing in application security. Please conduct a thorough security review of this code:

[CODE_HERE]

Security context:
[SECURITY_CONTEXT_HERE]
(e.g., handles user data, financial information, authentication, etc.)

Please provide:

**Vulnerability Assessment:**
- OWASP Top 10 vulnerabilities
- Input validation issues
- Authentication/authorization flaws
- Data exposure risks
- Injection vulnerabilities
- Cross-site scripting (XSS) risks
- Cryptographic weaknesses

**Security Recommendations:**
- Specific code fixes
- Security best practices
- Input sanitization
- Secure coding guidelines
- Error handling improvements

**Compliance Considerations:**
- GDPR/HIPAA/PCI-DSS requirements (if applicable)
- Industry security standards
- Data protection regulations

**Security Testing:**
- Suggested security tests
- Penetration testing approach
- Security code review checklist

**Implementation Priority:**
- Critical vs. moderate vs. low risk
- Quick wins vs. major refactoring
- Defense-in-depth strategies

Provide actionable recommendations with code examples for remediation.`,
    examples: ["Security review", "Fix vulnerabilities", "Secure this code"],
    color: "orange"
  }
];

const categoryIcons: Record<string, React.ReactNode> = {
  "Code Understanding": <BookOpen className="h-4 w-4" />,
  "Debugging": <Bug className="h-4 w-4" />,
  "Performance": <Zap className="h-4 w-4" />,
  "Testing": <TestTube className="h-4 w-4" />,
  "Code Quality": <Wrench className="h-4 w-4" />,
  "Documentation": <FileText className="h-4 w-4" />,
  "Architecture": <Building2 className="h-4 w-4" />,
  "Security": <Shield className="h-4 w-4" />,
};

const colorVariants: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    hover: "hover:bg-blue-500/20"
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    hover: "hover:bg-red-500/20"
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
    hover: "hover:bg-yellow-500/20"
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
    hover: "hover:bg-green-500/20"
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    hover: "hover:bg-purple-500/20"
  },
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    hover: "hover:bg-indigo-500/20"
  },
  pink: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    text: "text-pink-400",
    hover: "hover:bg-pink-500/20"
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    hover: "hover:bg-orange-500/20"
  }
};

export default function EnhancedPromptHelperImproved({
  onPromptSelect,
  onPromptSend,
  className
}: PromptHelperProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(new Set(promptTemplates.map(t => t.category)));
  const filteredTemplates = selectedCategory
    ? promptTemplates.filter(t => t.category === selectedCategory)
    : promptTemplates;

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPanelOpen) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen]);

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    onPromptSelect(template.template);
    setIsPanelOpen(false);
    setSelectedTemplate(null);
  };

  const handleQuickUse = (template: PromptTemplate) => {
    if (onPromptSend) {
      onPromptSend(template.template);
    } else {
      onPromptSelect(template.template);
    }
    setIsPanelOpen(false);
    setSelectedTemplate(null);
  };

  const handleQuickSelect = (template: PromptTemplate) => {
    handleQuickUse(template);
  };

  if (!isPanelOpen) {
    return (
      <Button
        onClick={() => setIsPanelOpen(true)}
        size="sm"
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-110 group",
          className
        )}
        aria-label="Open AI prompt templates"
      >
        <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-card border border-border rounded-md px-3 py-2 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Quick Prompts
        </span>
      </Button>
    );
  }

  if (selectedTemplate) {
    return (
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              colorVariants[selectedTemplate.color].bg,
              colorVariants[selectedTemplate.color].border,
              "border"
            )}>
              <span className="text-xl">{selectedTemplate.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{selectedTemplate.title}</h3>
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTemplate(null)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <h4 className="font-medium text-foreground text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Template Preview
            </h4>
            <Card className={cn(
              "p-3 border",
              colorVariants[selectedTemplate.color].bg,
              colorVariants[selectedTemplate.color].border
            )}>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-60 overflow-auto">
                {selectedTemplate.template}
              </pre>
            </Card>
          </div>

          {selectedTemplate.examples && selectedTemplate.examples.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground text-sm mb-2">Example Prompts:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.examples.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onPromptSelect(example)}
                    className="text-xs h-8 px-3 border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <Button
              onClick={() => handleUseTemplate(selectedTemplate)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Use Template
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickUse(selectedTemplate)}
              className="border-border hover:bg-accent hover:text-accent-foreground"
            >
              Use & Send
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsPanelOpen(false)}
              className="hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">AI Prompt Templates</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPanelOpen(false)}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-border bg-muted/10">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "text-xs h-8 px-3",
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "border-border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "text-xs h-8 px-3 flex items-center gap-1",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {categoryIcons[category]}
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "p-4 border cursor-pointer transition-all duration-200 hover:shadow-md",
                colorVariants[template.color].bg,
                colorVariants[template.color].border,
                colorVariants[template.color].hover
              )}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  colorVariants[template.color].bg,
                  colorVariants[template.color].border,
                  "border"
                )}>
                  <span className="text-sm">{template.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{template.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickSelect(template);
                  }}
                  className="text-xs h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Quick Use
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template);
                  }}
                  className="text-xs h-7 px-3 border-border hover:bg-accent hover:text-accent-foreground"
                >
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}