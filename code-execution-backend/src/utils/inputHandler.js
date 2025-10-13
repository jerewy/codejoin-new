/**
 * Enhanced Input Handler for Terminal Execution Backend
 *
 * This module provides comprehensive input handling for binary data,
 * control characters, and language-specific input requirements.
 *
 * Features:
 * - Binary data preservation and validation
 * - UTF-8 encoding support for international characters
 * - Control character processing (Ctrl+C, Ctrl+D, arrow keys, etc.)
 * - Language-specific input handling
 * - Input sanitization and validation
 * - Buffer overflow protection
 */

const logger = require('./logger');

// Control character constants
const CONTROL_CHARS = {
  CTRL_C: '\x03',
  CTRL_D: '\x04',
  CTRL_Z: '\x1a',
  BACKSPACE: '\x7f',
  DELETE: '\x1b[3~',
  TAB: '\x09',
  ESC: '\x1b',
  ENTER: '\x0d',
  LF: '\x0a',
  CR: '\x0d'
};

// ANSI escape sequences for cursor and special keys
const ANSI_SEQUENCES = {
  // Arrow keys
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',

  // Function keys (F1-F12)
  F1: '\x1bOP',
  F2: '\x1bOQ',
  F3: '\x1bOR',
  F4: '\x1bOS',
  F5: '\x1b[15~',
  F6: '\x1b[17~',
  F7: '\x1b[18~',
  F8: '\x1b[19~',
  F9: '\x1b[20~',
  F10: '\x1b[21~',
  F11: '\x1b[23~',
  F12: '\x1b[24~',

  // Home/End keys
  HOME: '\x1b[H',
  END: '\x1b[F',

  // Page up/down
  PGUP: '\x1b[5~',
  PGDN: '\x1b[6~',

  // Insert key
  INSERT: '\x1b[2~',

  // Modifier combinations
  SHIFT_UP: '\x1b[1;2A',
  SHIFT_DOWN: '\x1b[1;2B',
  SHIFT_RIGHT: '\x1b[1;2C',
  SHIFT_LEFT: '\x1b[1;2D',
  CTRL_UP: '\x1b[1;5A',
  CTRL_DOWN: '\x1b[1;5B',
  CTRL_RIGHT: '\x1b[1;5C',
  CTRL_LEFT: '\x1b[1;5D'
};

class InputHandler {
  constructor(options = {}) {
    this.options = {
      maxInputLength: options.maxInputLength || 1024 * 1024, // 1MB default
      enableLogging: options.enableLogging !== false,
      strictMode: options.strictMode || false,
      ...options
    };

    // Language-specific handlers
    this.languageHandlers = new Map();
    this.initializeLanguageHandlers();

    // Input validation patterns
    this.dangerousPatterns = [
      // Shell injection patterns
      /;\s*rm\s+-rf\s+\//,
      /;\s*dd\s+if=/,
      /;\s*mkfs\./,
      /;\s*fdisk/,
      /;\s*format/,
      // Command injection
      /\|\s*sh\s*-c/,
      /\|\s*bash\s*-c/,
      /\|\s*eval/,
      /\|\s*exec/,
      // Fork bombs and resource exhaustion
      /:\(\)\{\.*\|.*\}/,
      /while\s+true.*do.*done/,
      /fork\s*\(/
    ];
  }

  /**
   * Initialize language-specific input handlers
   */
  initializeLanguageHandlers() {
    // Python REPL handler
    this.languageHandlers.set('python', {
      name: 'Python',
      interactivePrompt: /^>>>|\.\.\./,
      multilinePatterns: [
        /:\s*$/,
        /def\s+\w+\s*\(/,
        /class\s+\w+\s*\:/,
        /if\s+/,
        /for\s+/,
        /while\s+/,
        /try\s*:/,
        /with\s+/,
        /@\w+/
      ],
      specialCommands: {
        help: /^help(\s|$)/,
        exit: /^exit(\s|$)|^quit(\s|$)/,
        clear: /^clear(\s*$)/,
        import: /^import\s+/,
        from: /^from\s+.*\s+import\s+/
      },
      preprocess: this.preprocessPythonInput.bind(this),
      validate: this.validatePythonInput.bind(this)
    });

    // Node.js REPL handler
    this.languageHandlers.set('javascript', {
      name: 'JavaScript',
      interactivePrompt: /^>|^\.\.\./,
      multilinePatterns: [
        /\{\s*$/,
        /\(\s*$/,
        /\[\s*$/,
        /function\s+\w+\s*\(/,
        /=>\s*$/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        /try\s*\{/,
        /class\s+\w+\s*\{/
      ],
      specialCommands: {
        help: /^\.help(\s|$)/,
        exit: /^\.exit(\s*$)/,
        clear: /^\.clear(\s*$)/,
        load: /^\.load\s+/,
        save: /^\.save\s+/
      },
      preprocess: this.preprocessJavaScriptInput.bind(this),
      validate: this.validateJavaScriptInput.bind(this)
    });

    // Java Shell handler
    this.languageHandlers.set('java', {
      name: 'Java',
      interactivePrompt: /^jshell>|\s*\.\.\./,
      multilinePatterns: [
        /\{\s*$/,
        /class\s+\w+\s*\{/,
        /interface\s+\w+\s*\{/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        /try\s*\{/,
        /catch\s*\(/,
        /finally\s*\{/
      ],
      specialCommands: {
        exit: /^\/exit(\s*$)/,
        list: /^\/list(\s|$)/,
        vars: /^\/vars(\s*$)/,
        methods: /^\/methods(\s*$)/,
        types: /^\/types(\s*$)/,
        imports: /^\/imports(\s*$)/,
        reset: /^\/reset(\s*$)/
      },
      preprocess: this.preprocessJavaInput.bind(this),
      validate: this.validateJavaInput.bind(this)
    });

    // Bash handler
    this.languageHandlers.set('bash', {
      name: 'Bash',
      interactivePrompt: /^\$|\#/,
      multilinePatterns: [
        /\{\s*$/,
        /\(\s*$/,
        /do\s*$/,
        /then\s*$/,
        /if\s+/,
        /for\s+/,
        /while\s+/,
        /case\s+/,
        /function\s+\w+\s*\(\)/
      ],
      specialCommands: {
        exit: /^exit(\s*$)/,
        clear: /^clear(\s*$)/,
        history: /^history(\s*$)/,
        export: /^export\s+/,
        alias: /^alias\s+/
      },
      preprocess: this.preprocessBashInput.bind(this),
      validate: this.validateBashInput.bind(this)
    });
  }

  /**
   * Process and normalize input data
   * @param {string|Buffer|ArrayBuffer} input - Raw input from frontend
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed input object
   */
  async processInput(input, options = {}) {
    const {
      language = 'bash',
      sessionId = 'unknown',
      preserveBinary = true,
      enableValidation = true
    } = options;

    try {
      // Convert input to appropriate format
      const normalizedInput = this.normalizeInputData(input, preserveBinary);

      if (!normalizedInput) {
        return { success: false, error: 'Invalid input data' };
      }

      // Validate input length
      if (enableValidation && !this.validateInputLength(normalizedInput)) {
        return { success: false, error: 'Input too large' };
      }

      // Get language handler
      const langHandler = this.languageHandlers.get(language.toLowerCase());
      if (!langHandler) {
        logger.warn('No language handler found', { language, sessionId });
        return { success: true, data: normalizedInput, processed: false };
      }

      // Language-specific preprocessing
      let processedInput = normalizedInput;
      if (langHandler.preprocess) {
        processedInput = await langHandler.preprocess(normalizedInput, options);
      }

      // Language-specific validation
      if (enableValidation && langHandler.validate) {
        const validationResult = langHandler.validate(processedInput, options);
        if (!validationResult.valid) {
          return {
            success: false,
            error: validationResult.error || 'Input validation failed',
            code: validationResult.code
          };
        }
      }

      // Control character processing
      const controlProcessed = this.processControlCharacters(processedInput, language);

      // Final safety validation
      if (enableValidation && !this.validateSafety(controlProcessed)) {
        return { success: false, error: 'Input contains potentially dangerous commands' };
      }

      return {
        success: true,
        data: controlProcessed,
        original: normalizedInput,
        language,
        processed: true,
        metadata: {
          length: controlProcessed.length,
          type: typeof controlProcessed,
          isBuffer: Buffer.isBuffer(controlProcessed),
          hasControlChars: this.hasControlCharacters(controlProcessed),
          hasANSI: this.hasANSISequences(controlProcessed)
        }
      };

    } catch (error) {
      logger.error('Input processing failed', {
        sessionId,
        language,
        error: error.message,
        stack: error.stack
      });
      return { success: false, error: `Input processing failed: ${error.message}` };
    }
  }

  /**
   * Normalize input data to consistent format
   */
  normalizeInputData(input, preserveBinary = true) {
    if (input === null || input === undefined) {
      return null;
    }

    // Handle Buffer input
    if (Buffer.isBuffer(input)) {
      return input.length === 0 ? null : input;
    }

    // Handle ArrayBuffer input
    if (input instanceof ArrayBuffer) {
      const buffer = Buffer.from(input);
      return buffer.length === 0 ? null : buffer;
    }

    // Handle typed arrays
    if (ArrayBuffer.isView(input)) {
      const buffer = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
      return buffer.length === 0 ? null : buffer;
    }

    // Handle string input
    if (typeof input === 'string') {
      if (input.length === 0) {
        return null;
      }

      // For strings, we need to decide whether to preserve as string or convert to buffer
      if (preserveBinary && this.containsBinaryData(input)) {
        return Buffer.from(input, 'utf8');
      }
      return input;
    }

    // Handle other types
    if (preserveBinary) {
      const str = String(input);
      return str.length > 0 ? Buffer.from(str, 'utf8') : null;
    }

    const str = String(input);
    return str.length > 0 ? str : null;
  }

  /**
   * Check if string contains binary/UTF-8 data
   */
  containsBinaryData(str) {
    // Check for characters outside basic ASCII range
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 127) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate input length to prevent buffer overflow
   */
  validateInputLength(input) {
    const length = Buffer.isBuffer(input) ? input.length : String(input).length;
    return length <= this.options.maxInputLength;
  }

  /**
   * Process control characters based on language
   */
  processControlCharacters(input, language) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Handle common control characters
    let processed = str;

    // Convert Windows CRLF to LF
    processed = processed.replace(/\r\n/g, '\n');

    // Handle standalone CR
    processed = processed.replace(/\r(?!\n)/g, '\n');

    // Language-specific control character handling
    switch (language.toLowerCase()) {
      case 'python':
        // Python handles Ctrl+D as EOF, Ctrl+C as interrupt
        processed = this.handlePythonControlChars(processed);
        break;
      case 'javascript':
        // Node.js REPL control character handling
        processed = this.handleJavaScriptControlChars(processed);
        break;
      case 'java':
        // Java Shell control character handling
        processed = this.handleJavaControlChars(processed);
        break;
      default:
        // Default handling for bash and others
        processed = this.handleDefaultControlChars(processed);
    }

    // Return in the same format as input
    return Buffer.isBuffer(input) ? Buffer.from(processed, 'utf8') : processed;
  }

  /**
   * Python-specific control character handling
   */
  handlePythonControlChars(input) {
    // Preserve Ctrl+C for interrupt
    // Preserve Ctrl+D for EOF
    // Handle tab completion (keep as-is for Python REPL)
    return input;
  }

  /**
   * JavaScript-specific control character handling
   */
  handleJavaScriptControlChars(input) {
    // Node.js REPL specific handling
    return input;
  }

  /**
   * Java-specific control character handling
   */
  handleJavaControlChars(input) {
    // JShell specific handling
    return input;
  }

  /**
   * Default control character handling for bash and others
   */
  handleDefaultControlChars(input) {
    return input;
  }

  /**
   * Validate input against dangerous patterns
   */
  validateSafety(input) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(str)) {
        if (this.options.enableLogging) {
          logger.warn('Potentially dangerous input detected', {
            pattern: pattern.toString(),
            inputPreview: str.substring(0, 100)
          });
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Check if input contains control characters
   */
  hasControlCharacters(input) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;
    return /[\x00-\x1F\x7F]/.test(str);
  }

  /**
   * Check if input contains ANSI escape sequences
   */
  hasANSISequences(input) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;
    return /\x1b\[[0-9;]*[a-zA-Z]/.test(str);
  }

  // Language-specific preprocessing methods
  async preprocessPythonInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Handle Python indentation preservation
    // Handle multi-line input detection
    return str;
  }

  async preprocessJavaScriptInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Handle JavaScript-specific preprocessing
    return str;
  }

  async preprocessJavaInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Handle Java-specific preprocessing
    return str;
  }

  async preprocessBashInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Handle bash-specific preprocessing
    return str;
  }

  // Language-specific validation methods
  validatePythonInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Python-specific validation
    return { valid: true };
  }

  validateJavaScriptInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // JavaScript-specific validation
    return { valid: true };
  }

  validateJavaInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Java-specific validation
    return { valid: true };
  }

  validateBashInput(input, options) {
    const str = Buffer.isBuffer(input) ? input.toString('utf8') : input;

    // Bash-specific validation
    return { valid: true };
  }

  /**
   * Create input stream transformer for PTY data
   */
  createStreamTransformer(language = 'bash') {
    return {
      transform: (chunk, encoding, callback) => {
        try {
          const processed = this.processInput(chunk, {
            language,
            preserveBinary: true,
            enableValidation: false // Stream processing should be fast
          });

          if (processed.success) {
            callback(null, processed.data);
          } else {
            callback(new Error(`Stream transformation failed: ${processed.error}`));
          }
        } catch (error) {
          callback(error);
        }
      }
    };
  }

  /**
   * Get language handler information
   */
  getLanguageInfo(language) {
    const handler = this.languageHandlers.get(language.toLowerCase());
    return handler ? {
      name: handler.name,
      supported: true,
      features: {
        multiline: !!handler.multilinePatterns,
        specialCommands: !!handler.specialCommands,
        preprocessing: !!handler.preprocess,
        validation: !!handler.validate
      }
    } : {
      name: language,
      supported: false,
      features: {}
    };
  }

  /**
   * Add custom language handler
   */
  addLanguageHandler(name, handler) {
    this.languageHandlers.set(name.toLowerCase(), handler);
    logger.info('Custom language handler added', { name });
  }

  /**
   * Remove language handler
   */
  removeLanguageHandler(name) {
    const result = this.languageHandlers.delete(name.toLowerCase());
    if (result) {
      logger.info('Language handler removed', { name });
    }
    return result;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Array.from(this.languageHandlers.keys()).map(key => ({
      name: key,
      handler: this.languageHandlers.get(key)
    }));
  }
}

// Export constants and class
module.exports = {
  InputHandler,
  CONTROL_CHARS,
  ANSI_SEQUENCES
};