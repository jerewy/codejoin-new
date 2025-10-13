const DockerService = require('../services/dockerService');
const { getLanguageConfig, isLanguageSupported } = require('../config/languages');
const logger = require('../utils/logger');
const Joi = require('joi');

const dockerService = new DockerService();

const isTestEnv = process.env.NODE_ENV === 'test';
const DEFAULT_MAX_CODE_SIZE = isTestEnv ? 25000 : 1048576;
const DEFAULT_MAX_INPUT_SIZE = 10240;

const envCodeLimit = parseInt(process.env.MAX_CODE_SIZE_BYTES || '', 10);
const MAX_CODE_SIZE_BYTES = Number.isFinite(envCodeLimit)
  ? (isTestEnv ? Math.min(envCodeLimit, DEFAULT_MAX_CODE_SIZE) : envCodeLimit)
  : DEFAULT_MAX_CODE_SIZE;

const envInputLimit = parseInt(process.env.MAX_INPUT_SIZE_BYTES || '', 10);
const MAX_INPUT_SIZE_BYTES = Number.isFinite(envInputLimit) ? envInputLimit : DEFAULT_MAX_INPUT_SIZE;

const executeSchema = Joi.object({
  language: Joi.string().required(),
  code: Joi.string().max(MAX_CODE_SIZE_BYTES).required(),
  stdin: Joi.string().max(MAX_INPUT_SIZE_BYTES).allow('').optional().default(''),
  timeout: Joi.number().min(1000).max(30000).optional()
}).custom((value, helpers) => {
  if (Buffer.byteLength(value.code || '', 'utf8') > MAX_CODE_SIZE_BYTES) {
    return helpers.error('any.custom', { message: 'Code exceeds maximum allowed size' });
  }

  if (Buffer.byteLength(value.stdin || '', 'utf8') > MAX_INPUT_SIZE_BYTES) {
    return helpers.error('any.custom', { message: 'Input exceeds maximum allowed size' });
  }

  return value;
}, 'execute payload validation');

class ExecuteController {
  async execute(req, res) {
    const requestId = req.id || 'unknown';

    try {
      // Validate request
      const requestPayload = { ...req.body };

      if (requestPayload.stdin === undefined && typeof requestPayload.input === 'string') {
        requestPayload.stdin = requestPayload.input;
      }

      // Remove legacy aliases before validation so Joi doesn't reject the payload
      if ('input' in requestPayload) {
        delete requestPayload.input;
      }

      const { error, value } = executeSchema.validate(requestPayload);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const { language, code, stdin, timeout } = value;

      // Check if language is supported
      if (!isLanguageSupported(language)) {
        return res.status(400).json({
          success: false,
          error: `Language '${language}' is not supported`
        });
      }

      // Get language configuration
      let languageConfig = getLanguageConfig(language);

      // Override timeout if provided and within limits
      if (timeout) {
        languageConfig = { ...languageConfig, timeout };
      }

      logger.info('Code execution request', {
        requestId,
        language,
        codeLength: code.length,
        stdinLength: stdin.length,
        timeout: languageConfig.timeout
      });

      // Execute code
      const result = await dockerService.executeCode(languageConfig, code, stdin);

      logger.info('Code execution completed', {
        requestId,
        language,
        success: result.success,
        executionTime: result.executionTime,
        exitCode: result.exitCode
      });

      // Return result
      res.json({
        success: result.success,
        language,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Execution controller error', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getLanguages(req, res) {
    try {
      const { SUPPORTED_LANGUAGES } = require('../config/languages');

      const languages = Object.entries(SUPPORTED_LANGUAGES).map(([key, config]) => ({
        id: key,
        name: config.name,
        type: config.type,
        fileExtension: config.fileExtension,
        timeout: config.timeout,
        memoryLimit: config.memoryLimit,
        cpuLimit: config.cpuLimit
      }));

      res.json({
        success: true,
        languages,
        count: languages.length
      });
    } catch (error) {
      logger.error('Get languages error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get supported languages'
      });
    }
  }

  async getSystemInfo(req, res) {
    try {
      const dockerInfo = await dockerService.getSystemInfo();

      res.json({
        success: true,
        system: {
          ...dockerInfo,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      });
    } catch (error) {
      logger.error('Get system info error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get system information'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      // Simple health check that doesn't test Docker connection
      // to avoid infinite loops when Docker is unavailable
      const dockerConnectionState = dockerService.getConnectionState();

      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        docker: {
          available: dockerConnectionState.isAvailable,
          lastChecked: dockerConnectionState.lastChecked ? new Date(dockerConnectionState.lastChecked).toISOString() : null,
          consecutiveFailures: dockerConnectionState.consecutiveFailures,
          backoffActive: dockerConnectionState.isAvailable === false && dockerConnectionState.consecutiveFailures > 0
        }
      };

      res.json(status);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = new ExecuteController();