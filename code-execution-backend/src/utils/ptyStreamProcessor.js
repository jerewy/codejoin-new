/**
 * PTY Stream Processor for Enhanced Terminal Input/Output
 *
 * This module provides comprehensive PTY stream processing with support for:
 * - Binary data preservation
 * - UTF-8 encoding handling
 * - Control character preservation and processing
 * - ANSI escape sequence handling
 * - Language-specific stream transformations
 */

const { Transform } = require('stream');
const { InputHandler, CONTROL_CHARS, ANSI_SEQUENCES } = require('./inputHandler');
const logger = require('./logger');

class PTYStreamProcessor extends Transform {
  constructor(options = {}) {
    super({
      objectMode: false, // Work with buffers
      highWaterMark: options.highWaterMark || 16 * 1024, // 16KB default
      decodeStrings: false, // Preserve binary data
      encoding: null // Don't encode, work with raw buffers
    });

    this.options = {
      language: options.language || 'bash',
      sessionId: options.sessionId || 'unknown',
      preserveANSI: options.preserveANSI !== false,
      preserveControlChars: options.preserveControlChars !== false,
      fixLineEndings: options.fixLineEndings !== false,
      enableLogging: options.enableLogging !== false,
      bufferSize: options.bufferSize || 8192,
      ...options
    };

    // Initialize input handler
    this.inputHandler = new InputHandler({
      maxInputLength: options.maxInputLength || 1024 * 1024,
      enableLogging: this.options.enableLogging,
      strictMode: options.strictMode || false
    });

    // Internal buffer for partial data
    this.buffer = Buffer.alloc(0);
    this.bufferSize = this.options.bufferSize;

    // Statistics
    this.stats = {
      bytesProcessed: 0,
      chunksProcessed: 0,
      controlCharsProcessed: 0,
      ansiSequencesProcessed: 0,
      errors: 0
    };

    // Language-specific state
    this.languageState = {
      currentPrompt: null,
      inMultiline: false,
      multilineIndent: 0,
      expectingMoreInput: false
    };

    logger.debug('PTY Stream Processor initialized', {
      sessionId: this.options.sessionId,
      language: this.options.language,
      options: this.options
    });
  }

  /**
   * Transform method for processing PTY data
   */
  _transform(chunk, encoding, callback) {
    try {
      // Ensure chunk is a buffer
      const inputBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);

      // Add to internal buffer
      this.buffer = Buffer.concat([this.buffer, inputBuffer]);

      // Process complete chunks from buffer
      this.processBuffer();

      // Update statistics
      this.stats.bytesProcessed += inputBuffer.length;
      this.stats.chunksProcessed++;

      callback();
    } catch (error) {
      this.stats.errors++;
      logger.error('PTY stream transformation error', {
        sessionId: this.options.sessionId,
        error: error.message,
        chunkLength: chunk.length
      });
      callback(error);
    }
  }

  /**
   * Process buffered data
   */
  processBuffer() {
    // While we have enough data to process meaningful chunks
    while (this.buffer.length > 0) {
      let processedChunk = null;

      // Try to extract complete logical units from buffer
      if (this.options.language === 'python') {
        processedChunk = this.extractPythonChunk();
      } else if (this.options.language === 'javascript') {
        processedChunk = this.extractJavaScriptChunk();
      } else if (this.options.language === 'java') {
        processedChunk = this.extractJavaChunk();
      } else {
        processedChunk = this.extractDefaultChunk();
      }

      if (!processedChunk) {
        // Not enough data for a complete chunk, wait for more
        break;
      }

      // Process the extracted chunk
      const finalChunk = this.processChunk(processedChunk);
      if (finalChunk && finalChunk.length > 0) {
        this.push(finalChunk);
      }
    }

    // Prevent buffer from growing too large
    if (this.buffer.length > this.bufferSize) {
      logger.warn('PTY buffer overflow, truncating', {
        sessionId: this.options.sessionId,
        bufferSize: this.buffer.length,
        maxSize: this.bufferSize
      });
      this.buffer = this.buffer.slice(-this.bufferSize);
    }
  }

  /**
   * Extract Python-specific chunks from buffer
   */
  extractPythonChunk() {
    // Python REPL prompt patterns
    const primaryPrompt = />>> $/;
    const secondaryPrompt = /\.\.\. $/;

    // Look for complete lines or prompts
    const str = this.buffer.toString('utf8', 0, Math.min(this.buffer.length, 1024));

    // Check for prompt at the end
    if (primaryPrompt.test(str) || secondaryPrompt.test(str)) {
      // We have a complete prompt line
      const promptMatch = str.match(/(>>> |\.\.\. )$/);
      if (promptMatch) {
        const promptIndex = str.lastIndexOf(promptMatch[0]);
        if (promptIndex > 0) {
          const chunkSize = Buffer.byteLength(str.slice(0, promptIndex + promptMatch[0].length), 'utf8');
          const chunk = this.buffer.slice(0, chunkSize);
          this.buffer = this.buffer.slice(chunkSize);
          return chunk;
        }
      }
    }

    // If no prompt, look for newline
    const newlineIndex = str.indexOf('\n');
    if (newlineIndex >= 0) {
      const chunkSize = Buffer.byteLength(str.slice(0, newlineIndex + 1), 'utf8');
      const chunk = this.buffer.slice(0, chunkSize);
      this.buffer = this.buffer.slice(chunkSize);
      return chunk;
    }

    // If buffer is getting large and we have no complete chunk, process what we have
    if (this.buffer.length >= 512) {
      const chunk = this.buffer.slice(0, 256); // Process half to leave room for completion
      this.buffer = this.buffer.slice(256);
      return chunk;
    }

    return null;
  }

  /**
   * Extract JavaScript-specific chunks from buffer
   */
  extractJavaScriptChunk() {
    // Node.js REPL prompt patterns
    const primaryPrompt = /^> $/m;
    const secondaryPrompt = /^\.\.\. $/m;

    const str = this.buffer.toString('utf8', 0, Math.min(this.buffer.length, 1024));

    // Similar logic to Python but for Node.js prompts
    const newlineIndex = str.indexOf('\n');
    if (newlineIndex >= 0) {
      const chunkSize = Buffer.byteLength(str.slice(0, newlineIndex + 1), 'utf8');
      const chunk = this.buffer.slice(0, chunkSize);
      this.buffer = this.buffer.slice(chunkSize);
      return chunk;
    }

    if (this.buffer.length >= 512) {
      const chunk = this.buffer.slice(0, 256);
      this.buffer = this.buffer.slice(256);
      return chunk;
    }

    return null;
  }

  /**
   * Extract Java-specific chunks from buffer
   */
  extractJavaChunk() {
    // JShell prompt patterns
    const str = this.buffer.toString('utf8', 0, Math.min(this.buffer.length, 1024));

    const newlineIndex = str.indexOf('\n');
    if (newlineIndex >= 0) {
      const chunkSize = Buffer.byteLength(str.slice(0, newlineIndex + 1), 'utf8');
      const chunk = this.buffer.slice(0, chunkSize);
      this.buffer = this.buffer.slice(chunkSize);
      return chunk;
    }

    if (this.buffer.length >= 512) {
      const chunk = this.buffer.slice(0, 256);
      this.buffer = this.buffer.slice(256);
      return chunk;
    }

    return null;
  }

  /**
   * Extract default chunks (for bash and others)
   */
  extractDefaultChunk() {
    const str = this.buffer.toString('utf8', 0, Math.min(this.buffer.length, 1024));

    // Look for newline as primary delimiter
    const newlineIndex = str.indexOf('\n');
    if (newlineIndex >= 0) {
      const chunkSize = Buffer.byteLength(str.slice(0, newlineIndex + 1), 'utf8');
      const chunk = this.buffer.slice(0, chunkSize);
      this.buffer = this.buffer.slice(chunkSize);
      return chunk;
    }

    // If we have carriage return without newline, process it
    const crIndex = str.indexOf('\r');
    if (crIndex >= 0) {
      const chunkSize = Buffer.byteLength(str.slice(0, crIndex + 1), 'utf8');
      const chunk = this.buffer.slice(0, chunkSize);
      this.buffer = this.buffer.slice(chunkSize);
      return chunk;
    }

    // Process large chunks to prevent buffer buildup
    if (this.buffer.length >= 1024) {
      const chunk = this.buffer.slice(0, 512);
      this.buffer = this.buffer.slice(512);
      return chunk;
    }

    return null;
  }

  /**
   * Process a chunk of data
   */
  processChunk(chunk) {
    if (!chunk || chunk.length === 0) {
      return chunk;
    }

    try {
      // Convert to string for processing, but preserve original for binary data
      const str = chunk.toString('utf8');
      let processed = str;

      // Fix line endings if requested
      if (this.options.fixLineEndings) {
        processed = this.fixLineEndings(processed);
      }

      // Process ANSI sequences if preservation is enabled
      if (this.options.preserveANSI) {
        this.processANSISequences(processed);
      }

      // Process control characters if preservation is enabled
      if (this.options.preserveControlChars) {
        this.processControlCharactersInChunk(processed);
      }

      // Language-specific processing
      processed = this.applyLanguageSpecificProcessing(processed);

      // Convert back to buffer
      return Buffer.from(processed, 'utf8');

    } catch (error) {
      logger.error('Chunk processing error', {
        sessionId: this.options.sessionId,
        error: error.message,
        chunkLength: chunk.length
      });
      // Return original chunk on error
      return chunk;
    }
  }

  /**
   * Fix line endings for cross-platform compatibility
   */
  fixLineEndings(str) {
    // Convert Windows CRLF to Unix LF
    str = str.replace(/\r\n/g, '\n');

    // Convert standalone CR to LF
    str = str.replace(/\r(?!\n)/g, '\n');

    return str;
  }

  /**
   * Process ANSI escape sequences
   */
  processANSISequences(str) {
    const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
    let match;

    while ((match = ansiRegex.exec(str)) !== null) {
      this.stats.ansiSequencesProcessed++;

      if (this.options.enableLogging) {
        logger.debug('ANSI sequence detected', {
          sessionId: this.options.sessionId,
          sequence: match[0],
          position: match.index
        });
      }
    }
  }

  /**
   * Process control characters in chunk
   */
  processControlCharactersInChunk(str) {
    // Count control characters
    const controlCharRegex = /[\x00-\x1F\x7F]/g;
    let match;

    while ((match = controlCharRegex.exec(str)) !== null) {
      this.stats.controlCharsProcessed++;

      if (this.options.enableLogging) {
        logger.debug('Control character detected', {
          sessionId: this.options.sessionId,
          char: match[0],
          charCode: match[0].charCodeAt(0),
          position: match.index
        });
      }
    }
  }

  /**
   * Apply language-specific processing
   */
  applyLanguageSpecificProcessing(str) {
    switch (this.options.language.toLowerCase()) {
      case 'python':
        return this.processPythonSpecific(str);
      case 'javascript':
        return this.processJavaScriptSpecific(str);
      case 'java':
        return this.processJavaSpecific(str);
      default:
        return this.processDefaultSpecific(str);
    }
  }

  /**
   * Python-specific processing
   */
  processPythonSpecific(str) {
    // Track Python REPL state
    if (str.includes('>>> ')) {
      this.languageState.currentPrompt = 'primary';
      this.languageState.inMultiline = false;
      this.languageState.multilineIndent = 0;
    } else if (str.includes('... ')) {
      this.languageState.currentPrompt = 'secondary';
      this.languageState.inMultiline = true;
    }

    // Handle Python-specific output processing
    return str;
  }

  /**
   * JavaScript-specific processing
   */
  processJavaScriptSpecific(str) {
    // Track Node.js REPL state
    if (str.endsWith('> ')) {
      this.languageState.currentPrompt = 'primary';
      this.languageState.inMultiline = false;
    } else if (str.endsWith('... ')) {
      this.languageState.currentPrompt = 'secondary';
      this.languageState.inMultiline = true;
    }

    return str;
  }

  /**
   * Java-specific processing
   */
  processJavaSpecific(str) {
    // Track JShell state
    if (str.includes('jshell>')) {
      this.languageState.currentPrompt = 'primary';
      this.languageState.inMultiline = false;
    } else if (str.match(/^\s*\.\.\./)) {
      this.languageState.currentPrompt = 'secondary';
      this.languageState.inMultiline = true;
    }

    return str;
  }

  /**
   * Default processing for bash and others
   */
  processDefaultSpecific(str) {
    // Track shell state
    if (str.match(/[$#]\s*$/)) {
      this.languageState.currentPrompt = 'primary';
      this.languageState.inMultiline = false;
    }

    return str;
  }

  /**
   * Flush method called when stream is ending
   */
  _flush(callback) {
    // Process any remaining data in buffer
    if (this.buffer.length > 0) {
      const finalChunk = this.processChunk(this.buffer);
      if (finalChunk && finalChunk.length > 0) {
        this.push(finalChunk);
      }
      this.buffer = Buffer.alloc(0);
    }

    // Log final statistics
    if (this.options.enableLogging) {
      logger.info('PTY Stream Processor flushed', {
        sessionId: this.options.sessionId,
        language: this.options.language,
        stats: this.stats
      });
    }

    callback();
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
      languageState: { ...this.languageState }
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      bytesProcessed: 0,
      chunksProcessed: 0,
      controlCharsProcessed: 0,
      ansiSequencesProcessed: 0,
      errors: 0
    };
  }

  /**
   * Create a processor for input streams (going to PTY)
   */
  static createInputProcessor(options = {}) {
    return new PTYStreamProcessor({
      ...options,
      direction: 'input'
    });
  }

  /**
   * Create a processor for output streams (coming from PTY)
   */
  static createOutputProcessor(options = {}) {
    return new PTYStreamProcessor({
      ...options,
      direction: 'output'
    });
  }
}

module.exports = {
  PTYStreamProcessor,
  CONTROL_CHARS,
  ANSI_SEQUENCES
};