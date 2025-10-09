/**
 * Response Cache System
 *
 * Intelligent caching system for AI responses with similarity matching,
 * semantic caching, and automatic cache management.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Cache Entry Types
 */
const CacheEntryType = {
  EXACT: 'exact',         // Exact prompt match
  SIMILAR: 'similar',     // Similar prompt match
  SEMANTIC: 'semantic'    // Semantic similarity match
};

/**
 * Response Cache Implementation
 */
class ResponseCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000; // Maximum number of entries
    this.ttl = options.ttl || 3600000;      // Time to live: 1 hour in milliseconds
    this.similarityThreshold = options.similarityThreshold || 0.8;
    this.enableSemanticCache = options.enableSemanticCache || false;
    this.enablePersistence = options.enablePersistence || false;
    this.persistencePath = options.persistencePath || './cache/ai-responses.json';

    // In-memory cache storage
    this.cache = new Map();
    this.indexMap = new Map(); // For faster lookups
    this.similarityIndex = new Map(); // For similarity matching

    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      similarityMatches: 0,
      semanticMatches: 0
    };

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000); // Cleanup every 5 minutes

    logger.info('Response cache initialized', {
      maxSize: this.maxSize,
      ttl: this.ttl,
      similarityThreshold: this.similarityThreshold,
      enableSemanticCache: this.enableSemanticCache
    });
  }

  /**
   * Get cached response for a prompt
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Cache options
   * @returns {Promise<AIResponse|null>} Cached response or null
   */
  async get(prompt, context = {}, options = {}) {
    const cacheKey = this.generateCacheKey(prompt, context);
    const startTime = Date.now();

    try {
      // Try exact match first
      let entry = this.cache.get(cacheKey);
      if (entry && !this.isExpired(entry)) {
        this.metrics.hits++;
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        logger.debug('Cache hit (exact)', {
          cacheKey: cacheKey.substring(0, 20) + '...',
          responseTime: Date.now() - startTime
        });

        return this.createCachedResponse(entry, CacheEntryType.EXACT);
      }

      // Try similarity match if enabled
      if (options.enableSimilarity !== false) {
        entry = await this.findSimilarEntry(prompt, context);
        if (entry && !this.isExpired(entry)) {
          this.metrics.hits++;
          this.metrics.similarityMatches++;
          entry.accessCount++;
          entry.lastAccessed = Date.now();

          logger.debug('Cache hit (similar)', {
            similarity: entry.similarity,
            responseTime: Date.now() - startTime
          });

          return this.createCachedResponse(entry, CacheEntryType.SIMILAR);
        }
      }

      // Try semantic match if enabled
      if (this.enableSemanticCache && options.enableSemantic !== false) {
        entry = await this.findSemanticEntry(prompt, context);
        if (entry && !this.isExpired(entry)) {
          this.metrics.hits++;
          this.metrics.semanticMatches++;
          entry.accessCount++;
          entry.lastAccessed = Date.now();

          logger.debug('Cache hit (semantic)', {
            semantic: entry.semantic,
            responseTime: Date.now() - startTime
          });

          return this.createCachedResponse(entry, CacheEntryType.SEMANTIC);
        }
      }

      this.metrics.misses++;
      return null;

    } catch (error) {
      logger.error('Cache get error', {
        error: error.message,
        cacheKey: cacheKey.substring(0, 20) + '...'
      });
      return null;
    }
  }

  /**
   * Cache a response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {AIResponse} response - Response to cache
   * @param {Object} options - Cache options
   */
  async set(prompt, context, response, options = {}) {
    const cacheKey = this.generateCacheKey(prompt, context);
    const ttl = options.ttl || this.ttl;

    try {
      // Check if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictLeastRecentlyUsed();
      }

      const entry = {
        cacheKey,
        prompt,
        context,
        response,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        type: options.type || CacheEntryType.EXACT,
        metadata: options.metadata || {}
      };

      // Generate prompt fingerprint for similarity matching
      entry.fingerprint = this.generatePromptFingerprint(prompt);

      this.cache.set(cacheKey, entry);
      this.updateIndex(entry);

      this.metrics.sets++;

      // Persist cache if enabled
      if (this.enablePersistence) {
        await this.persistCache();
      }

      logger.debug('Response cached', {
        cacheKey: cacheKey.substring(0, 20) + '...',
        responseLength: response.content?.length || 0
      });

    } catch (error) {
      logger.error('Cache set error', {
        error: error.message,
        cacheKey: cacheKey.substring(0, 20) + '...'
      });
    }
  }

  /**
   * Find similar entry in cache
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} Similar cache entry
   */
  async findSimilarEntry(prompt, context) {
    const fingerprint = this.generatePromptFingerprint(prompt);
    const promptWords = this.extractWords(prompt);

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      // Calculate similarity
      const similarity = this.calculateSimilarity(
        fingerprint,
        promptWords,
        entry.fingerprint,
        this.extractWords(entry.prompt)
      );

      if (similarity > this.similarityThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.similarity = bestSimilarity;
    }

    return bestMatch;
  }

  /**
   * Find semantic entry in cache
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} Semantic cache entry
   */
  async findSemanticEntry(prompt, context) {
    // TODO: Implement semantic matching using embeddings
    // This would integrate with vector embeddings for semantic similarity
    return null;
  }

  /**
   * Calculate similarity between two prompts
   * @param {string} fingerprint1 - First prompt fingerprint
   * @param {Array} words1 - First prompt words
   * @param {string} fingerprint2 - Second prompt fingerprint
   * @param {Array} words2 - Second prompt words
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(fingerprint1, words1, fingerprint2, words2) {
    // Exact fingerprint match
    if (fingerprint1 === fingerprint2) {
      return 1.0;
    }

    // Jaccard similarity for word sets
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    const jaccardSimilarity = intersection.size / union.size;

    // Weighted combination of fingerprint and word similarity
    const fingerprintSimilarity = this.calculateFingerprintSimilarity(fingerprint1, fingerprint2);

    return (jaccardSimilarity * 0.7) + (fingerprintSimilarity * 0.3);
  }

  /**
   * Calculate fingerprint similarity
   * @param {string} fingerprint1 - First fingerprint
   * @param {string} fingerprint2 - Second fingerprint
   * @returns {number} Similarity score (0-1)
   */
  calculateFingerprintSimilarity(fingerprint1, fingerprint2) {
    if (fingerprint1 === fingerprint2) return 1.0;

    // Simple character-based similarity
    const len1 = fingerprint1.length;
    const len2 = fingerprint2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1.0;

    let matches = 0;
    for (let i = 0; i < maxLen; i++) {
      if (fingerprint1[i] === fingerprint2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }

  /**
   * Generate cache key from prompt and context
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {string} Cache key
   */
  generateCacheKey(prompt, context) {
    const contextStr = JSON.stringify(context || {});
    const combined = `${prompt}:${contextStr}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Generate prompt fingerprint for similarity matching
   * @param {string} prompt - Input prompt
   * @returns {string} Prompt fingerprint
   */
  generatePromptFingerprint(prompt) {
    // Normalize prompt: lowercase, remove punctuation, extract key terms
    const normalized = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract first few characters as fingerprint
    return normalized.substring(0, 100);
  }

  /**
   * Extract words from prompt
   * @param {string} prompt - Input prompt
   * @returns {Array} Array of words
   */
  extractWords(prompt) {
    return prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words
  }

  /**
   * Update cache indexes
   * @param {Object} entry - Cache entry
   */
  updateIndex(entry) {
    // Update fingerprint index
    if (!this.indexMap.has(entry.fingerprint)) {
      this.indexMap.set(entry.fingerprint, []);
    }
    this.indexMap.get(entry.fingerprint).push(entry.cacheKey);
  }

  /**
   * Check if cache entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict least recently used entries
   */
  evictLeastRecentlyUsed() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toEvict = Math.ceil(this.maxSize * 0.1); // Evict 10% of entries
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [cacheKey, entry] = entries[i];
      this.delete(cacheKey);
    }

    logger.debug(`Cache eviction completed`, {
      evicted: toEvict,
      currentSize: this.cache.size
    });
  }

  /**
   * Delete entry from cache
   * @param {string} cacheKey - Cache key to delete
   */
  delete(cacheKey) {
    const entry = this.cache.get(cacheKey);
    if (entry) {
      this.cache.delete(cacheKey);
      this.removeFromIndex(entry);
      this.metrics.deletes++;
    }
  }

  /**
   * Remove entry from indexes
   * @param {Object} entry - Cache entry
   */
  removeFromIndex(entry) {
    const fingerprintEntries = this.indexMap.get(entry.fingerprint);
    if (fingerprintEntries) {
      const index = fingerprintEntries.indexOf(entry.cacheKey);
      if (index > -1) {
        fingerprintEntries.splice(index, 1);
      }
      if (fingerprintEntries.length === 0) {
        this.indexMap.delete(entry.fingerprint);
      }
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(cacheKey);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', {
        cleaned,
        currentSize: this.cache.size
      });
    }
  }

  /**
   * Create cached response object
   * @param {Object} entry - Cache entry
   * @param {string} type - Cache entry type
   * @returns {AIResponse} Cached response
   */
  createCachedResponse(entry, type) {
    const { AIResponse } = require('./provider-interface');
    const cachedResponse = new AIResponse(entry.response.content, {
      ...entry.response,
      isCached: true,
      cacheType: type,
      cacheTimestamp: entry.timestamp,
      similarity: entry.similarity,
      accessCount: entry.accessCount
    });

    return cachedResponse;
  }

  /**
   * Persist cache to disk
   */
  async persistCache() {
    // TODO: Implement cache persistence
    // This would save the cache to disk for recovery
  }

  /**
   * Load cache from disk
   */
  async loadPersistedCache() {
    // TODO: Implement cache loading
    // This would load the cache from disk on startup
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0;

    return {
      ...this.metrics,
      hitRate,
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
      similarityHitRate: this.metrics.hits > 0
        ? this.metrics.similarityMatches / this.metrics.hits
        : 0,
      semanticHitRate: this.metrics.hits > 0
        ? this.metrics.semanticMatches / this.metrics.hits
        : 0
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.indexMap.clear();
    this.similarityIndex.clear();

    logger.info('Cache cleared');
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

module.exports = {
  ResponseCache,
  CacheEntryType
};