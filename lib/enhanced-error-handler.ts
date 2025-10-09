export interface ErrorContext {
  operation: string;
  userId?: string;
  projectId?: string;
  conversationId?: string;
  requestId?: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface DetailedError extends Error {
  code?: string;
  details?: any;
  context?: ErrorContext;
  userMessage?: string;
  statusCode?: number;
  isOperational?: boolean;
}

export class DatabaseError extends Error implements DetailedError {
  code?: string;
  details?: any;
  context?: ErrorContext;
  userMessage?: string;
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    code?: string,
    context?: ErrorContext,
    userMessage?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.context = context;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.statusCode = this.getDefaultStatusCode(code);
    this.isOperational = this.isOperationalError(code);
  }

  private getDefaultUserMessage(code?: string): string {
    switch (code) {
      case '42501':
        return 'You do not have permission to perform this action';
      case '23503':
        return 'The referenced resource does not exist';
      case '23505':
        return 'This resource already exists';
      case '23514':
        return 'Invalid data provided';
      case 'PGRST116':
        return 'Resource not found';
      case '42702':
        return 'Database query error. Please try again.';
      case '08006':
      case '08001':
        return 'Database connection issue. Please try again later.';
      default:
        return 'An unexpected database error occurred';
    }
  }

  private getDefaultStatusCode(code?: string): number {
    switch (code) {
      case '42501':
        return 403; // Forbidden
      case '23503':
        return 404; // Not Found
      case '23505':
        return 409; // Conflict
      case '23514':
        return 400; // Bad Request
      case 'PGRST116':
        return 404; // Not Found
      case '42702':
        return 500; // Internal Server Error
      case '08006':
      case '08001':
        return 503; // Service Unavailable
      default:
        return 500; // Internal Server Error
    }
  }

  private isOperationalError(code?: string): boolean {
    // These are expected operational errors that should not crash the app
    const operationalCodes = ['42501', '23503', '23505', '23514', 'PGRST116'];
    return operationalCodes.includes(code || '');
  }
}

export class ValidationError extends Error implements DetailedError {
  details?: any;
  context?: ErrorContext;
  userMessage: string;
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    details?: any,
    context?: ErrorContext,
    userMessage?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.context = context;
    this.userMessage = userMessage || message;
    this.statusCode = 400;
    this.isOperational = true;
  }
}

export class AuthorizationError extends Error implements DetailedError {
  context?: ErrorContext;
  userMessage: string;
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    context?: ErrorContext,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.context = context;
    this.userMessage = userMessage || 'Access denied';
    this.statusCode = 403;
    this.isOperational = true;
  }
}

export class NotFoundError extends Error implements DetailedError {
  context?: ErrorContext;
  userMessage: string;
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    context?: ErrorContext,
    userMessage?: string
  ) {
    super(message);
    this.name = 'NotFoundError';
    this.context = context;
    this.userMessage = userMessage || 'Resource not found';
    this.statusCode = 404;
    this.isOperational = true;
  }
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Handle Supabase errors and convert to detailed error objects
   */
  handleSupabaseError(
    error: any,
    operation: string,
    context?: Partial<ErrorContext>
  ): DetailedError {
    const errorContext: ErrorContext = {
      operation,
      timestamp: new Date().toISOString(),
      ...context
    };

    // Log the error for debugging
    console.error(`[EnhancedErrorHandler] ${operation}:`, {
      error: error.message || error,
      code: error.code,
      details: error.details,
      hint: error.hint,
      context: errorContext
    });

    // Handle specific error codes
    if (error.code) {
      switch (error.code) {
        case '42501': // Permission denied
          return new DatabaseError(
            `Permission denied for ${operation}`,
            error.code,
            errorContext,
            'You do not have permission to perform this action'
          );

        case '23503': // Foreign key violation
          return new DatabaseError(
            `Foreign key violation in ${operation}`,
            error.code,
            errorContext,
            'The referenced resource does not exist'
          );

        case '23505': // Unique constraint violation
          return new DatabaseError(
            `Unique constraint violation in ${operation}`,
            error.code,
            errorContext,
            'This resource already exists'
          );

        case '23514': // Check constraint violation
          return new DatabaseError(
            `Check constraint violation in ${operation}`,
            error.code,
            errorContext,
            'Invalid data provided'
          );

        case 'PGRST116': // Not found
          return new DatabaseError(
            `Resource not found in ${operation}`,
            error.code,
            errorContext,
            'The requested resource was not found'
          );

        case '42702': // Ambiguous column
          return new DatabaseError(
            `Ambiguous column reference in ${operation}`,
            error.code,
            errorContext,
            'Database query error. Please try again.'
          );

        case '08006': // Connection failure
        case '08001': // Connection does not exist
          return new DatabaseError(
            `Database connection error in ${operation}`,
            error.code,
            errorContext,
            'Database temporarily unavailable. Please try again later.'
          );

        default:
          return new DatabaseError(
            `Database error in ${operation}: ${error.message}`,
            error.code,
            errorContext
          );
      }
    }

    // Handle non-coded errors
    if (error.message) {
      if (error.message.includes('infinite recursion')) {
        return new DatabaseError(
          `Recursive policy error in ${operation}`,
          'RLS_RECURSION',
          errorContext,
          'Access policy error. Please contact support.'
        );
      }

      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return new DatabaseError(
          `Timeout error in ${operation}`,
          'TIMEOUT',
          errorContext,
          'Request timed out. Please try again.'
        );
      }
    }

    // Generic error
    return new DatabaseError(
      `Unknown error in ${operation}: ${error.message || error}`,
      undefined,
      errorContext
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    message: string,
    details?: any,
    context?: Partial<ErrorContext>
  ): ValidationError {
    const errorContext: ErrorContext = {
      operation: 'validation',
      timestamp: new Date().toISOString(),
      ...context
    };

    console.error(`[EnhancedErrorHandler] Validation error:`, {
      message,
      details,
      context: errorContext
    });

    return new ValidationError(message, details, errorContext);
  }

  /**
   * Handle authorization errors
   */
  handleAuthorizationError(
    message: string,
    context?: Partial<ErrorContext>,
    userMessage?: string
  ): AuthorizationError {
    const errorContext: ErrorContext = {
      operation: 'authorization',
      timestamp: new Date().toISOString(),
      ...context
    };

    console.error(`[EnhancedErrorHandler] Authorization error:`, {
      message,
      context: errorContext
    });

    return new AuthorizationError(message, errorContext, userMessage);
  }

  /**
   * Handle not found errors
   */
  handleNotFoundError(
    resource: string,
    context?: Partial<ErrorContext>,
    userMessage?: string
  ): NotFoundError {
    const errorContext: ErrorContext = {
      operation: 'find',
      timestamp: new Date().toISOString(),
      ...context
    };

    console.error(`[EnhancedErrorHandler] Not found error:`, {
      resource,
      context: errorContext
    });

    return new NotFoundError(
      `${resource} not found`,
      errorContext,
      userMessage || `The requested ${resource.toLowerCase()} was not found`
    );
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse(error: DetailedError): {
    error: string;
    details?: any;
    userMessage: string;
    code?: string;
    context?: Omit<ErrorContext, 'ip' | 'userAgent'>; // Don't expose sensitive info
  } {
    return {
      error: error.message,
      userMessage: error.userMessage,
      code: error.code,
      ...(error.details && { details: error.details }),
      ...(error.context && {
        context: {
          operation: error.context.operation,
          timestamp: error.context.timestamp,
          userId: error.context.userId,
          projectId: error.context.projectId,
          conversationId: error.context.conversationId,
          requestId: error.context.requestId
        }
      })
    };
  }

  /**
   * Check if an error is operational (should not crash the app)
   */
  isOperationalError(error: any): boolean {
    return error.isOperational === true;
  }
}

// Export singleton instance
export const errorHandler = EnhancedErrorHandler.getInstance();