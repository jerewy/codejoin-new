import { QueryLogger } from '@/lib/ai-conversation-service-server';

export interface QueryValidationRule {
  name: string;
  validate: (query: string, params?: any[]) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface QueryMetrics {
  operation: string;
  query: string;
  params: any[];
  startTime: number;
  endTime: number;
  duration: number;
  recordCount?: number;
  error?: any;
  validationResult?: ValidationResult;
}

export class QueryValidator {
  private rules: QueryValidationRule[] = [];
  private metrics: QueryMetrics[] = [];
  private maxMetricsHistory: number = 1000;

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Rule: Check for ambiguous column references
    this.addRule({
      name: 'ambiguous_columns',
      validate: (query, params) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for unqualified project_id in JOIN queries
        if (query.includes('project_id') &&
            query.toLowerCase().includes('join') &&
            !query.includes('conversations.project_id') &&
            !query.includes('projects.project_id')) {
          errors.push('Ambiguous column reference: project_id should be qualified with table name');
          suggestions.push('Use conversations.project_id or projects.project_id instead');
        }

        // Check for SELECT * in JOIN queries
        if (query.includes('SELECT *') && query.toLowerCase().includes('join')) {
          warnings.push('SELECT * in JOIN queries can cause column ambiguity');
          suggestions.push('Use explicit column selection with table qualification');
        }

        // Check for missing table aliases
        if (query.toLowerCase().includes('join') && !query.includes('!')) {
          warnings.push('Consider using explicit foreign key relationships (!conversations_project_id_fkey)');
          suggestions.push('Use Supabase relationship syntax for better column qualification');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        };
      }
    });

    // Rule: Check for potential SQL injection patterns
    this.addRule({
      name: 'sql_injection_prevention',
      validate: (query, params) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Look for string concatenation patterns
        if (query.includes("' + ") || query.includes('" + ')) {
          errors.push('Potential SQL injection: string concatenation detected');
          suggestions.push('Use parameterized queries instead of string concatenation');
        }

        // Check for unescaped user input
        if (query.includes('${') && !query.includes('prepared')) {
          warnings.push('Template literals in SQL queries can be unsafe');
          suggestions.push('Use parameterized queries or validate input properly');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        };
      }
    });

    // Rule: Performance checks
    this.addRule({
      name: 'performance_checks',
      validate: (query, params) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for missing WHERE clauses in SELECT queries
        if (query.toLowerCase().includes('select') &&
            !query.toLowerCase().includes('where') &&
            !query.toLowerCase().includes('limit')) {
          warnings.push('SELECT query without WHERE clause may return too many records');
          suggestions.push('Consider adding WHERE conditions or LIMIT clause');
        }

        // Check for missing ORDER BY in queries that might need pagination
        if (query.toLowerCase().includes('select') &&
            !query.toLowerCase().includes('order by') &&
            !query.toLowerCase().includes('limit 1')) {
          warnings.push('Consider adding ORDER BY for consistent results');
          suggestions.push('Add ORDER BY clause for predictable ordering');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        };
      }
    });

    // Rule: Supabase-specific best practices
    this.addRule({
      name: 'supabase_best_practices',
      validate: (query, params) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for proper foreign key syntax
        if (query.includes('project:projects') && !query.includes('!')) {
          suggestions.push('Use explicit foreign key syntax: project:projects!conversations_project_id_fkey');
        }

        // Check for column list instead of *
        if (query.includes('SELECT *') && !query.includes('count')) {
          warnings.push('Avoid SELECT * in production queries');
          suggestions.push('Use explicit column lists for better performance');
        }

        // Check for proper error handling patterns
        if (query.toLowerCase().includes('select') &&
            !query.toLowerCase().includes('single()') &&
            !query.toLowerCase().includes('maybeSingle()') &&
            query.includes('.eq(')) {
          warnings.push('Consider using .single() or .maybeSingle() for single record queries');
          suggestions.push('Use .single() for expected single records, .maybeSingle() for optional records');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        };
      }
    });
  }

  /**
   * Add a custom validation rule
   */
  addRule(rule: QueryValidationRule) {
    this.rules.push(rule);
  }

  /**
   * Validate a query against all rules
   */
  validateQuery(query: string, params?: any[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allSuggestions: string[] = [];

    for (const rule of this.rules) {
      const result = rule.validate(query, params);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      allSuggestions.push(...result.suggestions);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions
    };
  }

  /**
   * Record query metrics for performance analysis
   */
  recordMetrics(metrics: QueryMetrics) {
    this.metrics.push(metrics);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log slow queries
    if (metrics.duration > 1000) {
      console.warn(`[QueryValidator] Slow query detected: ${metrics.operation} took ${metrics.duration}ms`);

      if (metrics.validationResult?.suggestions.length) {
        console.warn(`[QueryValidator] Optimization suggestions:`, metrics.validationResult.suggestions);
      }
    }

    // Log queries with validation errors
    if (metrics.validationResult?.errors.length) {
      console.error(`[QueryValidator] Query validation failed:`, {
        operation: metrics.operation,
        errors: metrics.validationResult.errors
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    queriesWithErrors: number;
    queriesWithWarnings: number;
    topSlowQueries: QueryMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        queriesWithErrors: 0,
        queriesWithWarnings: 0,
        topSlowQueries: []
      };
    }

    const totalQueries = this.metrics.length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / totalQueries;
    const slowQueries = this.metrics.filter(m => m.duration > 1000).length;
    const queriesWithErrors = this.metrics.filter(m => m.validationResult?.errors.length).length;
    const queriesWithWarnings = this.metrics.filter(m => m.validationResult?.warnings.length).length;

    const topSlowQueries = this.metrics
      .filter(m => m.duration > 500)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      queriesWithErrors,
      queriesWithWarnings,
      topSlowQueries
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Get recent metrics for a specific operation
   */
  getOperationMetrics(operation: string, limit: number = 50): QueryMetrics[] {
    return this.metrics
      .filter(m => m.operation === operation)
      .slice(-limit);
  }

  /**
   * Analyze query patterns and provide optimization recommendations
   */
  analyzePatterns(): {
    commonErrors: { [key: string]: number };
    commonWarnings: { [key: string]: number };
    optimizationOpportunities: string[];
  } {
    const errorCounts: { [key: string]: number } = {};
    const warningCounts: { [key: string]: number } = {};
    const opportunities: string[] = [];

    // Count errors and warnings
    this.metrics.forEach(metrics => {
      if (metrics.validationResult) {
        metrics.validationResult.errors.forEach(error => {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });

        metrics.validationResult.warnings.forEach(warning => {
          warningCounts[warning] = (warningCounts[warning] || 0) + 1;
        });
      }
    });

    // Generate optimization opportunities
    if (errorCounts['Ambiguous column reference: project_id should be qualified with table name'] > 0) {
      opportunities.push('Multiple ambiguous column reference errors detected. Review JOIN queries for proper table qualification.');
    }

    if (warningCounts['SELECT * in JOIN queries can cause column ambiguity'] > 5) {
      opportunities.push('Frequent SELECT * usage in JOIN queries. Consider using explicit column lists.');
    }

    if (this.metrics.filter(m => m.duration > 1000).length > this.metrics.length * 0.1) {
      opportunities.push('High percentage of slow queries (>10%). Consider database optimization or query refactoring.');
    }

    return {
      commonErrors: errorCounts,
      commonWarnings: warningCounts,
      optimizationOpportunities: opportunities
    };
  }
}

export class ValidatingQueryLogger implements QueryLogger {
  private validator: QueryValidator;
  private baseLogger: QueryLogger;

  constructor(baseLogger: QueryLogger, validator?: QueryValidator) {
    this.baseLogger = baseLogger;
    this.validator = validator || new QueryValidator();
  }

  logQuery(query: string, params?: any[], error?: any) {
    // Validate the query
    const validationResult = this.validator.validateQuery(query, params);

    // Log validation warnings and errors
    if (validationResult.warnings.length > 0) {
      console.warn(`[QueryValidator] Warnings for query:`, validationResult.warnings);
    }

    if (validationResult.errors.length > 0) {
      console.error(`[QueryValidator] Errors for query:`, validationResult.errors);
    }

    // Log the original query
    this.baseLogger.logQuery(query, params, error);

    // Log suggestions if there are issues
    if (validationResult.suggestions.length > 0) {
      console.info(`[QueryValidator] Suggestions:`, validationResult.suggestions);
    }
  }

  logPerformance(operation: string, duration: number, recordCount?: number) {
    // Get recent metrics for this operation
    const recentMetrics = this.validator.getOperationMetrics(operation, 10);
    const averageDuration = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    // Add performance warning if this query is significantly slower than average
    if (averageDuration > 0 && duration > averageDuration * 2) {
      console.warn(`[QueryValidator] Performance regression detected: ${operation} took ${duration}ms (average: ${averageDuration.toFixed(2)}ms)`);
    }

    this.baseLogger.logPerformance(operation, duration, recordCount);

    // Record metrics for analysis
    this.validator.recordMetrics({
      operation,
      query: '', // Would need to be passed from caller
      params: [],
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      recordCount
    });
  }

  /**
   * Get the underlying validator for analysis
   */
  getValidator(): QueryValidator {
    return this.validator;
  }
}

// Export singleton instance
export const queryValidator = new QueryValidator();