/**
 * Enhanced error handler specifically for project_id ambiguity errors
 * This provides better debugging and fallback mechanisms for column reference issues
 */

export interface ProjectIdAmbiguityError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  context?: {
    operation: string;
    table?: string;
    query?: string;
    parameters?: any[];
  };
}

export class ProjectIdAmbiguityHandler {
  /**
   * Check if an error is related to project_id ambiguity
   */
  static isProjectIdAmbiguityError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const errorCode = error.code;

    return (
      errorMessage.includes('column reference project_id is ambiguous') ||
      errorMessage.includes('project_id') && errorMessage.includes('ambiguous') ||
      errorCode === '42702' || // PostgreSQL ambiguous column error code
      errorMessage.includes('column reference') && errorMessage.includes('ambiguous')
    );
  }

  /**
   * Create an enhanced error object with debugging context
   */
  static createAmbiguityError(
    originalError: any,
    operation: string,
    context?: {
      table?: string;
      query?: string;
      parameters?: any[];
    }
  ): ProjectIdAmbiguityError {
    const error = new Error(
      `Project ID ambiguity in ${operation}: ${originalError.message || 'Unknown error'}`
    ) as ProjectIdAmbiguityError;

    error.name = 'ProjectIdAmbiguityError';
    error.code = originalError.code;
    error.details = originalError.details;
    error.hint = 'Use qualified column references (table.project_id) in queries with joins';
    error.context = {
      operation,
      ...context
    };

    // Copy stack trace
    if (originalError.stack) {
      error.stack = originalError.stack;
    }

    return error;
  }

  /**
   * Log detailed debugging information for project_id ambiguity
   */
  static logAmbiguityError(error: ProjectIdAmbiguityError): void {
    console.group('🔍 Project ID Ambiguity Error Detected');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Operation:', error.context?.operation);
    console.error('Table:', error.context?.table);
    console.error('Query:', error.context?.query);
    console.error('Parameters:', error.context?.parameters);
    console.error('Hint:', error.hint);
    console.error('Details:', error.details);
    console.groupEnd();
  }

  /**
   * Suggest fixes for common project_id ambiguity scenarios
   */
  static suggestFixes(error: ProjectIdAmbiguityError): string[] {
    const fixes: string[] = [];

    if (error.context?.operation?.includes('select') || error.context?.operation?.includes('join')) {
      fixes.push('Use table aliases: SELECT c.project_id FROM conversations c JOIN projects p ON c.project_id = p.id');
      fixes.push('Qualify all project_id references with table names or aliases');
    }

    if (error.context?.operation?.includes('insert')) {
      fixes.push('Explicitly list columns in INSERT statements instead of using *');
      fixes.push('Check RLS policies that might be joining tables with project_id columns');
    }

    if (error.context?.table?.includes('conversations') || error.context?.table?.includes('messages')) {
      fixes.push('Review foreign key relationships between conversations, messages, and projects tables');
      fixes.push('Ensure all JOIN conditions use qualified column names');
    }

    fixes.push('Run: SELECT table_name, column_name FROM information_schema.columns WHERE column_name = \'project_id\'');
    fixes.push('Check for any views or stored procedures with unqualified project_id references');

    return fixes;
  }

  /**
   * Get a user-friendly error message for the UI
   */
  static getUserFriendlyMessage(error: ProjectIdAmbiguityError): string {
    return 'There was an issue accessing the project data. This appears to be a database reference issue that our team is working to resolve. Please try again in a moment.';
  }

  /**
   * Attempt to fix common query patterns that cause ambiguity
   */
  static attemptQueryFix(query: string, operation: string): string {
    // Fix common patterns in SELECT queries
    if (operation.includes('select')) {
      // Add table aliases if missing
      let fixedQuery = query;

      // Fix unqualified project_id in SELECT clauses
      fixedQuery = fixedQuery.replace(
        /SELECT([^\.]+)\s+project_id/gi,
        'SELECT$1 conversations.project_id'
      );

      // Fix unqualified project_id in WHERE clauses
      fixedQuery = fixedQuery.replace(
        /WHERE\s+project_id\s*=/gi,
        'WHERE conversations.project_id ='
      );

      // Fix unqualified project_id in JOIN conditions
      fixedQuery = fixedQuery.replace(
        /ON\s+project_id\s*=/gi,
        'ON conversations.project_id ='
      );

      return fixedQuery;
    }

    return query;
  }
}

/**
 * Enhanced wrapper for Supabase operations that handles project_id ambiguity
 */
export function withProjectIdAmbiguityHandling<T extends any[], R>(
  operation: string,
  supabaseOperation: (...args: T) => Promise<R>,
  context?: {
    table?: string;
    query?: string;
  }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await supabaseOperation(...args);
    } catch (error) {
      if (ProjectIdAmbiguityHandler.isProjectIdAmbiguityError(error)) {
        const enhancedError = ProjectIdAmbiguityHandler.createAmbiguityError(
          error,
          operation,
          context
        );

        ProjectIdAmbiguityHandler.logAmbiguityError(enhancedError);

        // Re-throw with enhanced information
        throw enhancedError;
      }

      // Re-throw original error if it's not a project_id ambiguity
      throw error;
    }
  };
}