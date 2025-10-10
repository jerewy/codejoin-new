"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  X,
  ChevronLeft,
  BookOpen,
  Bug,
  Zap,
  FlaskConical,
  Wrench,
  FileText,
  Building,
  Lock,
  Search
} from "lucide-react";

interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  icon: string;
  description: string;
  template: string;
  examples?: string[];
}

interface FABPromptHelperProps {
  onPromptSelect: (prompt: string) => void;
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
    examples: ["Explain this React component", "What does this algorithm do?", "Break down this function"]
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
    examples: ["Fix this runtime error", "Why isn't my code working?", "Help debug this logic"]
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
    examples: ["Make this faster", "Optimize memory usage", "Improve algorithm efficiency"]
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
    examples: ["Write tests for this function", "Create unit tests", "Test this API endpoint"]
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
    examples: ["Clean up this code", "Improve structure", "Refactor for maintainability"]
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
    examples: ["Document this function", "Add code comments", "Create documentation"]
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
    examples: ["Apply design patterns", "Improve architecture", "Implement SOLID principles"]
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
    examples: ["Security review", "Fix vulnerabilities", "Secure this code"]
  }
];

const categoryIcons: Record<string, React.ReactNode> = {
  "Code Understanding": <BookOpen className="h-4 w-4" />,
  "Debugging": <Bug className="h-4 w-4" />,
  "Performance": <Zap className="h-4 w-4" />,
  "Testing": <FlaskConical className="h-4 w-4" />,
  "Code Quality": <Wrench className="h-4 w-4" />,
  "Documentation": <FileText className="h-4 w-4" />,
  "Architecture": <Building className="h-4 w-4" />,
  "Security": <Lock className="h-4 w-4" />,
};

export default function FABPromptHelper({ onPromptSelect }: FABPromptHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = Array.from(new Set(promptTemplates.map(t => t.category)));

  const filteredTemplates = selectedCategory
    ? promptTemplates.filter(t => t.category === selectedCategory)
    : promptTemplates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    onPromptSelect(template.template);
    setIsOpen(false);
    setSelectedTemplate(null);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const handleQuickSelect = (template: PromptTemplate) => {
    onPromptSelect(template.template);
    setIsOpen(false);
    setSelectedTemplate(null);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  if (selectedTemplate) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-card border-border mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="font-semibold text-card-foreground">{selectedTemplate.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-card-foreground mb-2">Template Preview:</h4>
              <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground max-h-60 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{selectedTemplate.template}</pre>
              </div>
            </div>

            {selectedTemplate.examples && selectedTemplate.examples.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-card-foreground mb-2">Example Prompts:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.examples.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => onPromptSelect(example)}
                      className="text-xs h-8 px-3 hover:bg-muted"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => handleUseTemplate(selectedTemplate)}
                className="flex-1"
              >
                Use This Template
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
              >
                Back
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground z-40"
        aria-label="Open AI prompt templates"
        title="Open AI prompt templates"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-card border-l border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-panel-title"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3" id="prompt-panel-title">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-card-foreground">AI Prompts</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedCategory(null);
                    setSearchQuery("");
                  }}
                  className="h-8 w-8 p-0"
                  aria-label="Close prompt templates"
                  title="Close prompt templates"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    aria-label="Search prompt templates"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="p-4 border-b border-border">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs h-8 px-3"
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="text-xs h-8 px-3 flex items-center gap-1"
                    >
                      {categoryIcons[category]}
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-3">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="p-4 bg-card border-border hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-card-foreground text-sm">{template.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {categoryIcons[template.category]}
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
                          className="text-xs h-7 px-3"
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
                          className="text-xs h-7 px-3"
                        >
                          Preview
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}