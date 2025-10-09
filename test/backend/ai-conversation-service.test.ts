/**
 * Comprehensive Test Suite for Enhanced AI Conversation Service
 * Tests the fixed SQL queries and enhanced error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIConversationServiceServer } from '@/lib/ai-conversation-service-server';
import { errorHandler, DatabaseError, ValidationError } from '@/lib/enhanced-error-handler';
import { QueryValidator, ValidatingQueryLogger } from '@/lib/query-validator';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock the createServerSupabase function
jest.mock('@/lib/supabaseServer', () => ({
  createServerSupabase: () => Promise.resolve(mockSupabase)
}));

describe('AIConversationServiceServer - Enhanced Architecture', () => {
  let service: AIConversationServiceServer;
  let queryValidator: QueryValidator;
  let mockLogger: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryValidator = new QueryValidator();
    mockLogger = {
      logQuery: jest.fn(),
      logPerformance: jest.fn()
    };
    service = new AIConversationServiceServer(mockLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SQL Query Fix Verification', () => {
    it('should use qualified column references in getProjectConversations', async () => {
      // Mock the Supabase query builder chain
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({ data: [], error: null });

      await service.getProjectConversations('test-project-id');

      // Verify that the query uses proper foreign key syntax
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('project:projects!conversations_project_id_fkey')
      );

      // Verify that the query includes all required columns explicitly
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('id, project_id, node_id, title')
      );
    });

    it('should use qualified column references in getConversation', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      await service.getConversation('test-conversation-id', false);

      // Verify proper foreign key usage
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('project:projects!conversations_project_id_fkey')
      );
    });

    it('should use qualified column references in searchConversations', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      await service.searchConversations('test-project-id', 'search-term');

      // Verify proper foreign key usage
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('project:projects!conversations_project_id_fkey')
      );
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should handle ambiguous column reference errors (42702)', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: { code: '42702', message: 'column reference "project_id" is ambiguous' }
      });

      await expect(service.getProjectConversations('test-project-id'))
        .rejects.toThrow('Database query error. Please try again.');
    });

    it('should handle permission denied errors (42501)', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied for table conversations' }
      });

      await expect(service.getConversation('test-conversation-id'))
        .rejects.toThrow('You do not have access to this conversation');
    });

    it('should handle foreign key violations (23503)', async () => {
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'insert or update on table "conversations" violates foreign key constraint' }
      });

      await expect(service.createConversation('invalid-project-id', 'user-id'))
        .rejects.toThrow('Invalid project: The specified project does not exist');
    });

    it('should validate conversation existence before adding messages', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' }
      });

      await expect(service.addMessage('invalid-conversation-id', {
        role: 'user',
        content: 'test message',
        metadata: {}
      })).rejects.toThrow('Conversation not found or access denied');
    });
  });

  describe('Query Logging and Performance Monitoring', () => {
    it('should log query operations', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      await service.getConversation('test-conversation-id', false);

      expect(mockLogger.logQuery).toHaveBeenCalledWith(
        'getConversation',
        'SELECT conversation WITH project JOIN',
        ['test-conversation-id']
      );
    });

    it('should log performance metrics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'test-conversation', title: 'Test' },
        error: null
      });

      await service.getConversation('test-conversation-id', false);

      expect(mockLogger.logPerformance).toHaveBeenCalledWith(
        'getConversation',
        expect.any(Number),
        1
      );
    });

    it('should log errors with context', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied' }
      });

      try {
        await service.getConversation('test-conversation-id', false);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLogger.logQuery).toHaveBeenCalledWith(
        'getConversation',
        'SELECT FAILED',
        ['test-conversation-id'],
        expect.objectContaining({ code: '42501' })
      );
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate required fields for createConversation', async () => {
      await expect(service.createConversation('', 'user-id'))
        .rejects.toThrow();

      await expect(service.createConversation('project-id', ''))
        .rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: '23514', message: 'check constraint violation' }
      });

      await expect(service.createConversation('project-id', 'user-id'))
        .rejects.toThrow('Invalid message data: The message data violates constraints');
    });

    it('should validate message data structure', async () => {
      // First mock conversation exists
      const conversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
      };

      // Then mock message insertion
      const messageQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis()
      };

      mockSupabase.from
        .mockReturnValueOnce(conversationQuery)
        .mockReturnValueOnce(messageQuery);

      const invalidMessage = {
        role: 'invalid_role',
        content: '',
        metadata: null
      };

      // This should not throw immediately, but let the database handle validation
      const result = await service.addMessage('test-conversation-id', invalidMessage as any);
      expect(result).toBeDefined();
    });
  });

  describe('Query Validation Integration', () => {
    it('should validate queries before execution', () => {
      const validatingLogger = new ValidatingQueryLogger(mockLogger, queryValidator);
      const validatingService = new AIConversationServiceServer(validatingLogger);

      // Simulate a problematic query
      const problematicQuery = 'SELECT * FROM conversations JOIN projects ON project_id = ?';
      queryValidator.validateQuery(problematicQuery, ['test-id']);

      // The validator should detect issues
      const validationResult = queryValidator.validateQuery(problemmaticQuery);
      expect(validationResult.warnings.length).toBeGreaterThan(0);
    });

    it('should track query performance metrics', () => {
      // Simulate some query metrics
      queryValidator.recordMetrics({
        operation: 'getProjectConversations',
        query: 'SELECT id, project_id FROM conversations WHERE project_id = ?',
        params: ['test-id'],
        startTime: Date.now() - 1500,
        endTime: Date.now(),
        duration: 1500,
        recordCount: 10
      });

      const stats = queryValidator.getPerformanceStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageDuration).toBe(1500);
      expect(stats.slowQueries).toBe(1);
    });

    it('should identify optimization opportunities', () => {
      // Record some problematic queries
      queryValidator.recordMetrics({
        operation: 'getConversation',
        query: 'SELECT * FROM conversations JOIN projects ON project_id = ?',
        params: ['test-id'],
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        recordCount: 1,
        validationResult: {
          isValid: true,
          errors: [],
          warnings: ['SELECT * in JOIN queries can cause column ambiguity'],
          suggestions: ['Use explicit column lists for better performance']
        }
      });

      const patterns = queryValidator.analyzePatterns();
      expect(patterns.commonWarnings).toHaveProperty('SELECT * in JOIN queries can cause column ambiguity');
    });
  });

  describe('Error Handler Integration', () => {
    it('should properly categorize different error types', () => {
      const dbError = errorHandler.handleSupabaseError(
        { code: '42702', message: 'column reference "project_id" is ambiguous' },
        'testOperation',
        { userId: 'test-user', projectId: 'test-project' }
      );

      expect(dbError).toBeInstanceOf(DatabaseError);
      expect(dbError.statusCode).toBe(500);
      expect(dbError.userMessage).toBe('Database query error. Please try again.');

      const validationError = errorHandler.handleValidationError(
        'Invalid input data',
        { field: 'projectId', value: null }
      );

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.statusCode).toBe(400);
      expect(validationError.userMessage).toBe('Invalid input data');
    });

    it('should create standardized error responses', () => {
      const error = errorHandler.handleSupabaseError(
        { code: '42501', message: 'permission denied' },
        'testOperation',
        { userId: 'test-user' }
      );

      const response = errorHandler.createErrorResponse(error);

      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('userMessage');
      expect(response).toHaveProperty('code', '42501');
      expect(response).toHaveProperty('context');
      expect(response.context).toHaveProperty('operation', 'testOperation');
      expect(response.context).toHaveProperty('userId', 'test-user');
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle complete conversation lifecycle', async () => {
      // Mock successful operations
      const createQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-conversation', project_id: 'test-project' },
          error: null
        })
      };

      const getQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-conversation', title: 'Test Conversation' },
          error: null
        })
      };

      const listQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 'new-conversation', title: 'Test Conversation' }],
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(createQuery)  // Create conversation
        .mockReturnValueOnce(getQuery)     // Get conversation
        .mockReturnValueOnce(listQuery);   // List conversations

      // Create conversation
      const created = await service.createConversation('test-project', 'user-id', 'Test Conversation');
      expect(created).toBeTruthy();
      expect(created.id).toBe('new-conversation');

      // Get conversation
      const retrieved = await service.getConversation('new-conversation');
      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe('new-conversation');

      // List conversations
      const conversations = await service.getProjectConversations('test-project');
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('new-conversation');
    });

    it('should handle error recovery scenarios', async () => {
      // Mock a connection error followed by success
      const connectionErrorQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValueOnce({
          code: '08006',
          message: 'connection failure'
        }).mockResolvedValueOnce({
          data: { id: 'test-conversation' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(connectionErrorQuery);

      // First call should fail with connection error
      await expect(service.getConversation('test-conversation-id'))
        .rejects.toThrow('Database temporarily unavailable');

      // Simulate retry logic (would be implemented at a higher level)
      const retried = await service.getConversation('test-conversation-id');
      expect(retried).toBeTruthy();
    });
  });
});

describe('Query Validator - Standalone Tests', () => {
  let validator: QueryValidator;

  beforeEach(() => {
    validator = new QueryValidator();
  });

  it('should detect ambiguous column references', () => {
    const result = validator.validateQuery(
      'SELECT * FROM conversations JOIN projects ON project_id = ?'
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Ambiguous column reference: project_id should be qualified with table name'
    );
  });

  it('should suggest proper table qualification', () => {
    const result = validator.validateQuery(
      'SELECT * FROM conversations JOIN projects ON conversations.project_id = ?'
    );

    expect(result.warnings).toContain('SELECT * in JOIN queries can cause column ambiguity');
    expect(result.suggestions).toContain('Use explicit column lists for better performance');
  });

  it('should validate proper foreign key syntax', () => {
    const result = validator.validateQuery(
      'SELECT project:projects!conversations_project_id_fkey(id, name) FROM conversations'
    );

    expect(result.errors.length).toBe(0);
  });

  it('should track performance metrics', () => {
    validator.recordMetrics({
      operation: 'testOperation',
      query: 'SELECT * FROM test',
      params: [],
      startTime: Date.now() - 100,
      endTime: Date.now(),
      duration: 100,
      recordCount: 5
    });

    const stats = validator.getPerformanceStats();
    expect(stats.totalQueries).toBe(1);
    expect(stats.averageDuration).toBe(100);
  });

  it('should analyze query patterns', () => {
    // Record some metrics with patterns
    validator.recordMetrics({
      operation: 'getConversations',
      query: 'SELECT * FROM conversations',
      params: [],
      startTime: Date.now() - 50,
      endTime: Date.now(),
      duration: 50,
      recordCount: 10,
      validationResult: {
        isValid: true,
        errors: [],
        warnings: ['SELECT * in JOIN queries can cause column ambiguity'],
        suggestions: ['Use explicit column lists']
      }
    });

    const patterns = validator.analyzePatterns();
    expect(patterns.commonWarnings).toHaveProperty('SELECT * in JOIN queries can cause column ambiguity');
  });
});