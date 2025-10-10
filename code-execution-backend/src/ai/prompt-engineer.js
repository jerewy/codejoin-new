/**
 * Advanced Prompt Engineering System
 *
 * Intelligent prompt optimization for coding assistance with context-aware
 * prompting, dynamic template selection, and multi-modal support.
 */

const logger = require('../utils/logger');

class PromptEngineer {
  constructor(options = {}) {
    this.options = {
      enableContextOptimization: options.enableContextOptimization !== false,
      enableDynamicTemplates: options.enableDynamicTemplates !== false,
      enableCodeAnalysis: options.enableCodeAnalysis !== false,
      maxContextLength: options.maxContextLength || 8000,
      ...options
    };

    // Prompt templates for different scenarios
    this.templates = this.initializeTemplates();

    // Code analysis patterns
    this.codePatterns = this.initializeCodePatterns();

    // Context optimization strategies
    this.contextStrategies = this.initializeContextStrategies();

    logger.info('Prompt Engineer initialized', {
      templateCount: Object.keys(this.templates).length,
      codePatternCount: Object.keys(this.codePatterns).length,
      contextStrategyCount: Object.keys(this.contextStrategies).length
    });
  }

  /**
   * Generate optimized prompt for AI request
   * @param {string} prompt - Original user prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Optimized prompt with metadata
   */
  async generateOptimizedPrompt(prompt, context = {}, options = {}) {
    const startTime = Date.now();

    try {
      // Analyze the request type and intent
      const analysis = await this.analyzeRequest(prompt, context);

      // Select appropriate template
      const template = this.selectTemplate(analysis, options);

      // Optimize context if enabled
      let optimizedContext = context;
      if (this.options.enableContextOptimization) {
        optimizedContext = await this.optimizeContext(context, analysis, template);
      }

      // Build the enhanced prompt
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, optimizedContext, analysis, template);

      // Analyze code if present and enabled
      let codeAnalysis = null;
      if (this.options.enableCodeAnalysis && analysis.hasCode) {
        codeAnalysis = await this.analyzeCode(prompt, context, analysis);
      }

      const processingTime = Date.now() - startTime;

      const result = {
        originalPrompt: prompt,
        optimizedPrompt: enhancedPrompt,
        analysis,
        template: template.name,
        context: optimizedContext,
        codeAnalysis,
        metadata: {
          processingTime,
          optimizations: this.getAppliedOptimizations(analysis, template, optimizedContext),
          promptLength: enhancedPrompt.length,
          contextSize: this.calculateContextSize(optimizedContext)
        }
      };

      logger.debug('Prompt optimization completed', {
        processingTime,
        template: template.name,
        originalLength: prompt.length,
        optimizedLength: enhancedPrompt.length,
        optimizations: result.metadata.optimizations.length
      });

      return result;

    } catch (error) {
      logger.error('Prompt optimization failed', {
        error: error.message,
        prompt: prompt.substring(0, 100) + '...'
      });

      // Return original prompt if optimization fails
      return {
        originalPrompt: prompt,
        optimizedPrompt: prompt,
        analysis: { type: 'general', intent: 'unknown', complexity: 'medium' },
        template: 'fallback',
        context,
        codeAnalysis: null,
        metadata: {
          processingTime: Date.now() - startTime,
          optimizations: [],
          error: error.message
        }
      };
    }
  }

  /**
   * Analyze the user request to determine intent, type, and complexity
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Request analysis
   */
  async analyzeRequest(prompt, context) {
    const promptLower = prompt.toLowerCase();

    // Determine request type
    const type = this.determineRequestType(prompt, context);

    // Determine user intent
    const intent = this.determineUserIntent(prompt, context);

    // Analyze complexity
    const complexity = this.analyzeComplexity(prompt, context);

    // Check for code presence
    const hasCode = this.hasCodeContent(prompt, context);

    // Identify programming languages
    const languages = this.identifyLanguages(prompt, context);

    // Detect specific scenarios
    const scenarios = this.detectScenarios(prompt, context);

    return {
      type,
      intent,
      complexity,
      hasCode,
      languages,
      scenarios,
      promptLength: prompt.length,
      contextDepth: this.calculateContextDepth(context)
    };
  }

  /**
   * Determine the type of request
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {string} Request type
   */
  determineRequestType(prompt, context) {
    const promptLower = prompt.toLowerCase();

    // Code generation indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.generation)) {
      return 'code_generation';
    }

    // Debugging indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.debugging)) {
      return 'debugging';
    }

    // Explanation indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.explanation)) {
      return 'explanation';
    }

    // Review indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.review)) {
      return 'code_review';
    }

    // Refactoring indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.refactoring)) {
      return 'refactoring';
    }

    // Testing indicators
    if (this.matchesPatterns(promptLower, this.codePatterns.testing)) {
      return 'testing';
    }

    return 'general';
  }

  /**
   * Determine user intent
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {string} User intent
   */
  determineUserIntent(prompt, context) {
    const promptLower = prompt.toLowerCase();

    const intents = {
      'create': ['create', 'make', 'build', 'generate', 'write', 'implement', 'develop'],
      'fix': ['fix', 'solve', 'repair', 'resolve', 'debug', 'correct'],
      'understand': ['explain', 'understand', 'what is', 'how does', 'why', 'describe'],
      'improve': ['improve', 'optimize', 'enhance', 'refactor', 'better'],
      'learn': ['learn', 'teach', 'show me', 'help me', 'guide'],
      'validate': ['check', 'validate', 'verify', 'test', 'review', 'analyze']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (this.matchesPatterns(promptLower, keywords)) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Analyze request complexity
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {string} Complexity level
   */
  analyzeComplexity(prompt, context) {
    let complexityScore = 0;

    // Length-based complexity
    if (prompt.length > 500) complexityScore += 1;
    if (prompt.length > 1000) complexityScore += 1;

    // Code block complexity
    const codeBlocks = (prompt.match(/```[\s\S]*?```/g) || []).length;
    complexityScore += Math.min(codeBlocks, 2);

    // Technical terms
    const technicalTerms = ['algorithm', 'architecture', 'design pattern', 'optimization', 'concurrency'];
    const technicalCount = technicalTerms.filter(term => prompt.toLowerCase().includes(term)).length;
    complexityScore += Math.min(technicalCount, 2);

    // Context complexity
    if (context && Object.keys(context).length > 3) complexityScore += 1;
    if (context && context.conversationHistory && context.conversationHistory.length > 5) complexityScore += 1;

    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 4) return 'medium';
    return 'complex';
  }

  /**
   * Check if prompt contains code
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {boolean} True if contains code
   */
  hasCodeContent(prompt, context) {
    const codeIndicators = [
      /```[\s\S]*?```/g,  // Code blocks
      /`[^`]+`/g,          // Inline code
      /\b(function|class|def|const|let|var|import|export)\b/g,
      /\b(if|else|for|while|switch|try|catch)\b/g,
      /[{}[\]();]/g
    ];

    return codeIndicators.some(pattern => pattern.test(prompt)) ||
           (context && context.codeSnippets && context.codeSnippets.length > 0);
  }

  /**
   * Identify programming languages in prompt
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {Array} Detected languages
   */
  identifyLanguages(prompt, context) {
    const languages = [];

    const languagePatterns = {
      'javascript': [/javascript|js|node|react|vue|angular/gi, /\.js$/g],
      'python': [/python|py|django|flask|pandas|numpy/gi, /\.py$/g],
      'java': [/java|spring|hibernate|maven|gradle/gi, /\.java$/g],
      'typescript': [/typescript|ts|tsx/gi, /\.ts$/g],
      'cpp': [/c\+\+|cpp|gcc|clang/gi, /\.(cpp|cc|cxx|hpp)$/g],
      'csharp': [/c#|csharp|\.net|mono/gi, /\.cs$/g],
      'php': [/php|laravel|symfony/gi, /\.php$/g],
      'ruby': [/ruby|rails|gem/gi, /\.rb$/g],
      'go': [/golang|go|goroutine/gi, /\.go$/g],
      'rust': [/rust|cargo|crate/gi, /\.rs$/g],
      'sql': [/sql|select|insert|update|delete|create table/gi, /\.sql$/g],
      'html': [/html|<[^>]+>/gi, /\.html?$/g],
      'css': [/css|\.|#\w+\s*{/gi, /\.css$/g],
      'json': [/json|\{[\s\S]*\}/gi, /\.json$/g]
    };

    for (const [language, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(prompt)) ||
          (context && context.fileExtensions && context.fileExtensions.some(ext => patterns[1].test(ext)))) {
        languages.push(language);
      }
    }

    return languages.length > 0 ? languages : ['unknown'];
  }

  /**
   * Detect specific scenarios in the request
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {Array} Detected scenarios
   */
  detectScenarios(prompt, context) {
    const scenarios = [];
    const promptLower = prompt.toLowerCase();

    const scenarioPatterns = {
      'error_handling': [/error|exception|try|catch|throw/gi],
      'database': [/database|db|sql|query|migration/gi],
      'api': [/api|endpoint|rest|graphql|request|response/gi],
      'authentication': [/auth|login|signup|password|token|jwt/gi],
      'deployment': [/deploy|docker|kubernetes|ci\/cd|production/gi],
      'performance': [/performance|optimize|slow|memory|cpu/gi],
      'security': [/security|vulnerability|encrypt|hash|csrf|xss/gi],
      'testing': [/test|unit|integration|e2e|jest|mocha/gi],
      'ui': [/ui|ux|component|frontend|interface/gi],
      'backend': [/backend|server|service|microservice/gi]
    };

    for (const [scenario, patterns] of Object.entries(scenarioPatterns)) {
      if (patterns.some(pattern => pattern.test(promptLower))) {
        scenarios.push(scenario);
      }
    }

    return scenarios;
  }

  /**
   * Select appropriate template based on analysis
   * @param {Object} analysis - Request analysis
   * @param {Object} options - Generation options
   * @returns {Object} Selected template
   */
  selectTemplate(analysis, options) {
    const templateKey = options.template || this.getTemplateKey(analysis);

    if (this.templates[templateKey]) {
      return { ...this.templates[templateKey], name: templateKey };
    }

    // Fallback to general template
    return { ...this.templates.general, name: 'general' };
  }

  /**
   * Get template key based on analysis
   * @param {Object} analysis - Request analysis
   * @returns {string} Template key
   */
  getTemplateKey(analysis) {
    // Specific templates for different combinations
    if (analysis.type === 'code_generation' && analysis.complexity === 'complex') {
      return 'complex_code_generation';
    }
    if (analysis.type === 'debugging') {
      return 'debugging';
    }
    if (analysis.type === 'code_review') {
      return 'code_review';
    }
    if (analysis.type === 'explanation' && analysis.hasCode) {
      return 'code_explanation';
    }
    if (analysis.scenarios.includes('performance')) {
      return 'performance_optimization';
    }
    if (analysis.scenarios.includes('security')) {
      return 'security_review';
    }

    // Type-based templates
    const typeTemplates = {
      'code_generation': 'code_generation',
      'explanation': 'explanation',
      'refactoring': 'refactoring',
      'testing': 'testing'
    };

    return typeTemplates[analysis.type] || 'general';
  }

  /**
   * Optimize context for better AI responses
   * @param {Object} context - Original context
   * @param {Object} analysis - Request analysis
   * @param {Object} template - Selected template
   * @returns {Promise<Object>} Optimized context
   */
  async optimizeContext(context, analysis, template) {
    let optimizedContext = { ...context };

    // Apply context optimization strategies
    for (const strategy of template.contextStrategies || []) {
      if (this.contextStrategies[strategy]) {
        optimizedContext = await this.contextStrategies[strategy](optimizedContext, analysis);
      }
    }

    // Limit context size if necessary
    const contextSize = this.calculateContextSize(optimizedContext);
    if (contextSize > this.options.maxContextLength) {
      optimizedContext = await this.truncateContext(optimizedContext, this.options.maxContextLength);
    }

    return optimizedContext;
  }

  /**
   * Build enhanced prompt with template and context
   * @param {string} prompt - Original prompt
   * @param {Object} context - Optimized context
   * @param {Object} analysis - Request analysis
   * @param {Object} template - Selected template
   * @returns {string} Enhanced prompt
   */
  buildEnhancedPrompt(prompt, context, analysis, template) {
    let enhancedPrompt = '';

    // Add system message from template
    if (template.systemMessage) {
      enhancedPrompt += template.systemMessage + '\n\n';
    }

    // Add context information
    const contextInfo = this.buildContextInfo(context, analysis, template);
    if (contextInfo) {
      enhancedPrompt += contextInfo + '\n\n';
    }

    // Add the original user prompt
    enhancedPrompt += prompt;

    // Add additional instructions from template
    if (template.additionalInstructions) {
      enhancedPrompt += '\n\n' + template.additionalInstructions;
    }

    return enhancedPrompt;
  }

  /**
   * Build context information string
   * @param {Object} context - Context object
   * @param {Object} analysis - Request analysis
   * @param {Object} template - Selected template
   * @returns {string} Context information
   */
  buildContextInfo(context, analysis, template) {
    let contextInfo = '';

    // Project information
    if (context.projectName) {
      contextInfo += `Project: ${context.projectName}\n`;
    }

    // Programming languages
    if (analysis.languages.length > 0 && analysis.languages[0] !== 'unknown') {
      contextInfo += `Languages: ${analysis.languages.join(', ')}\n`;
    }

    // Code snippets
    if (context.codeSnippets && context.codeSnippets.length > 0) {
      contextInfo += '\nCode Context:\n';
      context.codeSnippets.forEach((snippet, index) => {
        contextInfo += `${index + 1}. ${snippet.language || 'unknown'}:\n${snippet.code}\n\n`;
      });
    }

    // Error information
    if (context.error) {
      contextInfo += `\nError Information:\n${context.error}\n\n`;
    }

    // File context
    if (context.fileName) {
      contextInfo += `File: ${context.fileName}`;
      if (context.fileContent) {
        contextInfo += `\n\`\`\`${this.getFileLanguage(context.fileName)}\n${context.fileContent}\n\`\`\``;
      }
      contextInfo += '\n\n';
    }

    // Conversation history (limited)
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-3); // Last 3 messages
      if (recentHistory.length > 0) {
        contextInfo += 'Recent Conversation:\n';
        recentHistory.forEach(msg => {
          contextInfo += `${msg.role}: ${msg.content}\n`;
        });
        contextInfo += '\n';
      }
    }

    return contextInfo.trim();
  }

  /**
   * Analyze code content for better understanding
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @param {Object} analysis - Request analysis
   * @returns {Promise<Object>} Code analysis results
   */
  async analyzeCode(prompt, context, analysis) {
    const codeAnalysis = {
      snippets: [],
      patterns: [],
      issues: [],
      suggestions: []
    };

    // Extract code blocks from prompt
    const codeBlocks = prompt.match(/```[\s\S]*?```/g) || [];

    codeBlocks.forEach((block, index) => {
      const language = this.extractCodeLanguage(block);
      const code = this.extractCodeContent(block);

      codeAnalysis.snippets.push({
        index,
        language,
        code,
        lines: code.split('\n').length,
        complexity: this.estimateCodeComplexity(code)
      });
    });

    // Analyze code patterns
    if (context.codeSnippets) {
      context.codeSnippets.forEach(snippet => {
        const patterns = this.identifyCodePatterns(snippet.code, snippet.language);
        codeAnalysis.patterns.push(...patterns);
      });
    }

    return codeAnalysis;
  }

  /**
   * Initialize prompt templates
   * @returns {Object} Template definitions
   */
  initializeTemplates() {
    return {
      general: {
        systemMessage: 'You are a helpful AI assistant specializing in software development and coding.',
        contextStrategies: ['conversation_history', 'project_context'],
        additionalInstructions: 'Provide clear, accurate, and helpful responses.'
      },

      code_generation: {
        systemMessage: 'You are an expert software developer and code generator. Write clean, efficient, and well-documented code.',
        contextStrategies: ['code_snippets', 'project_context', 'language_specific'],
        additionalInstructions: 'Provide code examples with explanations. Follow best practices and include error handling.'
      },

      complex_code_generation: {
        systemMessage: 'You are a senior software architect and expert developer. You excel at creating complex, scalable solutions.',
        contextStrategies: ['code_snippets', 'project_context', 'architecture_context', 'performance_considerations'],
        additionalInstructions: 'Provide comprehensive solutions with detailed explanations, considerations for scalability, performance, and maintainability.'
      },

      debugging: {
        systemMessage: 'You are an expert debugging specialist. You systematically identify issues and provide solutions.',
        contextStrategies: ['error_context', 'code_snippets', 'environment_context'],
        additionalInstructions: 'Analyze the error systematically, identify root causes, and provide step-by-step solutions. Include preventive measures.'
      },

      code_review: {
        systemMessage: 'You are a senior code reviewer with expertise in best practices, security, and maintainability.',
        contextStrategies: ['code_snippets', 'project_standards', 'security_considerations'],
        additionalInstructions: 'Provide constructive feedback focusing on code quality, performance, security, and best practices.'
      },

      explanation: {
        systemMessage: 'You are an excellent technical educator who explains complex concepts clearly and concisely.',
        contextStrategies: ['code_snippets', 'conceptual_context'],
        additionalInstructions: 'Provide clear explanations with examples. Break down complex topics into understandable parts.'
      },

      code_explanation: {
        systemMessage: 'You are a code analysis expert who explains code functionality, patterns, and design decisions.',
        contextStrategies: ['code_snippets', 'project_context', 'language_specific'],
        additionalInstructions: 'Explain the code\'s purpose, logic, patterns used, and suggest improvements where applicable.'
      },

      refactoring: {
        systemMessage: 'You are a refactoring specialist focused on improving code quality, maintainability, and structure.',
        contextStrategies: ['code_snippets', 'project_patterns', 'performance_considerations'],
        additionalInstructions: 'Identify improvement opportunities and provide refactored code with explanations of the benefits.'
      },

      testing: {
        systemMessage: 'You are a testing expert who creates comprehensive test suites and testing strategies.',
        contextStrategies: ['code_snippets', 'testing_context', 'project_patterns'],
        additionalInstructions: 'Provide appropriate test cases with different scenarios, edge cases, and testing best practices.'
      },

      performance_optimization: {
        systemMessage: 'You are a performance optimization expert specializing in code efficiency and scalability.',
        contextStrategies: ['performance_context', 'code_snippets', 'bottleneck_analysis'],
        additionalInstructions: 'Identify performance bottlenecks and provide optimized solutions with benchmarks and explanations.'
      },

      security_review: {
        systemMessage: 'You are a security expert focused on identifying vulnerabilities and security best practices.',
        contextStrategies: ['security_context', 'code_snippets', 'threat_analysis'],
        additionalInstructions: 'Identify security vulnerabilities and provide secure coding recommendations with explanations.'
      }
    };
  }

  /**
   * Initialize code analysis patterns
   * @returns {Object} Code pattern definitions
   */
  initializeCodePatterns() {
    return {
      generation: [
        'create', 'make', 'build', 'generate', 'write', 'implement', 'develop',
        'code', 'function', 'class', 'component', 'module'
      ],
      debugging: [
        'error', 'bug', 'issue', 'problem', 'fix', 'solve', 'debug',
        'exception', 'crash', 'fail', 'broken', 'not working'
      ],
      explanation: [
        'explain', 'what is', 'how does', 'why', 'describe',
        'tell me about', 'understand', 'clarify'
      ],
      review: [
        'review', 'check', 'analyze', 'evaluate', 'assess',
        'improve', 'optimize', 'better'
      ],
      refactoring: [
        'refactor', 'restructure', 'reorganize', 'cleanup',
        'improve structure', 'better design'
      ],
      testing: [
        'test', 'testing', 'unit test', 'integration test', 'e2e',
        'test case', 'coverage', 'mock', 'stub'
      ]
    };
  }

  /**
   * Initialize context optimization strategies
   * @returns {Object} Context strategy functions
   */
  initializeContextStrategies() {
    return {
      conversation_history: (context) => this.optimizeConversationHistory(context),
      project_context: (context) => this.optimizeProjectContext(context),
      code_snippets: (context) => this.optimizeCodeSnippets(context),
      language_specific: (context) => this.addLanguageSpecificContext(context),
      error_context: (context) => this.optimizeErrorContext(context),
      environment_context: (context) => this.addEnvironmentContext(context),
      performance_considerations: (context) => this.addPerformanceContext(context),
      security_considerations: (context) => this.addSecurityContext(context),
      architecture_context: (context) => this.addArchitectureContext(context),
      testing_context: (context) => this.addTestingContext(context)
    };
  }

  // Helper methods (implementations would go here)
  matchesPatterns(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
  }

  calculateContextDepth(context) {
    return context ? Object.keys(context).length : 0;
  }

  calculateContextSize(context) {
    return JSON.stringify(context).length;
  }

  getAppliedOptimizations(analysis, template, context) {
    // Return list of applied optimizations
    return [];
  }

  extractCodeLanguage(codeBlock) {
    const match = codeBlock.match(/```(\w+)/);
    return match ? match[1] : 'unknown';
  }

  extractCodeContent(codeBlock) {
    return codeBlock.replace(/```\w*/, '').replace(/```/, '').trim();
  }

  estimateCodeComplexity(code) {
    // Simple complexity estimation
    return code.split('\n').length;
  }

  identifyCodePatterns(code, language) {
    // Pattern identification logic
    return [];
  }

  getFileLanguage(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'json': 'json'
    };
    return languageMap[ext] || 'unknown';
  }

  // Context optimization strategy implementations
  async optimizeConversationHistory(context) {
    if (!context.conversationHistory) return context;

    // Keep only recent relevant messages
    const recentHistory = context.conversationHistory.slice(-5);
    return { ...context, conversationHistory: recentHistory };
  }

  async optimizeProjectContext(context) {
    // Add project-specific context if available
    return context;
  }

  async optimizeCodeSnippets(context) {
    // Prioritize relevant code snippets
    return context;
  }

  async addLanguageSpecificContext(context) {
    // Add language-specific best practices
    return context;
  }

  async optimizeErrorContext(context) {
    // Extract and format error information
    return context;
  }

  async addEnvironmentContext(context) {
    // Add environment-specific context
    return context;
  }

  async addPerformanceContext(context) {
    // Add performance-related context
    return context;
  }

  async addSecurityContext(context) {
    // Add security-related context
    return context;
  }

  async addArchitectureContext(context) {
    // Add architecture-related context
    return context;
  }

  async addTestingContext(context) {
    // Add testing-related context
    return context;
  }

  async truncateContext(context, maxLength) {
    // Smart context truncation
    return context;
  }
}

module.exports = PromptEngineer;