const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DockerService {
  constructor() {
    // Configure Docker connection based on platform
    let dockerOptions = {};

    if (process.platform === 'win32') {
      // Windows-specific configuration
      dockerOptions = {
        socketPath: process.env.DOCKER_SOCKET || '//./pipe/docker_engine',
        // Alternative: use TCP connection
        // host: 'localhost',
        // port: 2375,
        // protocol: 'http'
      };

      // Try TCP connection as fallback if socket fails
      if (process.env.DOCKER_HOST) {
        const dockerHost = process.env.DOCKER_HOST;
        if (dockerHost.startsWith('tcp://')) {
          const url = new URL(dockerHost);
          dockerOptions = {
            host: url.hostname,
            port: parseInt(url.port) || 2375,
            protocol: 'http'
          };
        }
      }
    } else {
      // Unix/Linux configuration (default)
      dockerOptions = {
        socketPath: '/var/run/docker.sock'
      };
    }

    this.docker = new Docker(dockerOptions);
    this.runningContainers = new Map();

    logger.info('Docker service initialized', {
      platform: process.platform,
      options: JSON.stringify(dockerOptions, null, 2)
    });
  }

  async executeCode(languageConfig, code, input = '') {
    const containerId = uuidv4();
    let container = null;

    try {
      // Test Docker connection first
      await this.testConnection();

      // Create container with security restrictions
      container = await this.createSecureContainer(languageConfig, code, containerId, input);

      // Store reference for cleanup
      this.runningContainers.set(containerId, container);

      // Start container and capture output
      const result = await this.runContainer(container, languageConfig);
      const success = result.exitCode === 0;

      return {
        success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime
      };

    } catch (error) {
      const details = this.extractDockerErrorDetails(error);
      const detailMessage = this.composeDockerErrorMessage(details);
      const summaryMessage = typeof error.message === 'string' && error.message.trim()
        ? error.message.trim()
        : detailMessage;
      const logDetails = {
        ...details,
        stack: error.stack
      };

      logger.error(`Docker execution error: ${summaryMessage}`, { containerId, error: logDetails });

      let errorMessage = summaryMessage;
      const detailForMessage = detailMessage || summaryMessage;
      const summaryLower = summaryMessage ? summaryMessage.toLowerCase() : '';
      const detailLower = detailMessage ? detailMessage.toLowerCase() : summaryLower;

      if (this.isDockerConnectionIssue(summaryMessage, detailMessage)) {
        const friendly = 'Docker is not running or not accessible. Please start Docker Desktop and try again.';
        if (detailForMessage && !friendly.toLowerCase().includes(detailForMessage.toLowerCase())) {
          errorMessage = `${friendly} (Details: ${detailForMessage})`;
        } else {
          errorMessage = friendly;
        }
      } else if (summaryLower.includes('permission denied') || detailLower.includes('permission denied')) {
        errorMessage = 'Permission denied accessing Docker. Make sure your user has access to Docker.';
      } else if (summaryLower.includes('no such image') || detailLower.includes('no such image')) {
        errorMessage = `Docker image '${languageConfig.image}' not found. Please pull the required images.`;
      }

      return {
        success: false,
        output: '',
        error: errorMessage,
        exitCode: 1,
        executionTime: 0
      };
    } finally {
      // Always cleanup
      await this.cleanup(containerId, container);
    }
  }

  async testConnection() {
    try {
      await this.docker.ping();
      logger.debug('Docker connection test successful');
    } catch (error) {
      const details = this.extractDockerErrorDetails(error);
      const detailedMessage = this.composeDockerErrorMessage(details);
      logger.error('Docker connection test failed', { error: details });
      const connectionError = new Error(this.composeDockerErrorMessage(details, { prefix: 'Docker connection failed: ' }));
      connectionError.dockerDetails = { ...details };
      connectionError.cause = error;
      throw connectionError;
    }
  }

  async createSecureContainer(languageConfig, code, containerId, input = '') {
    const fileName = this.getFileName(languageConfig);
    const codeContent = this.prepareCode(code, languageConfig);
    const normalizedInput = this.normalizeInput(input);
    const hasInput = normalizedInput.length > 0;

    const containerConfig = {
      Image: languageConfig.image,
      name: `code-exec-${containerId}`,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      OpenStdin: false,
      StdinOnce: false,
      NetworkMode: 'none', // No network access
      User: 'nobody', // Run as non-root user
      WorkingDir: '/tmp',
      Env: [
        'HOME=/tmp',
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      ],
      HostConfig: {
        Memory: this.parseMemoryLimit(languageConfig.memoryLimit),
        CpuQuota: Math.floor(languageConfig.cpuLimit * 100000),
        CpuPeriod: 100000,
        PidsLimit: languageConfig.name === 'Go' ? 128 : 64, // Higher process limit for Go
        ReadonlyRootfs: false, // Need write access for compilation
        Tmpfs: {
          '/tmp': 'rw,exec,nosuid,size=100m',
          '/var/tmp': 'rw,noexec,nosuid,size=10m'
        },
        Ulimits: this.getUlimitsForLanguage(languageConfig),
        SecurityOpt: [
          'no-new-privileges:true'
        ],
        CapDrop: ['ALL'] // Drop all capabilities
      }
    };

    if (languageConfig.name === 'SQL') {
      const escapedCode = codeContent
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\"'\"'")
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
        .replace(/\r/g, '\\r');

      containerConfig.Cmd = ['sh', '-c', `printf '${escapedCode}' > /tmp/${fileName} && ${languageConfig.runCommand}`];
    } else {
      const commandParts = [];
      const base64Code = Buffer.from(codeContent, 'utf-8').toString('base64');
      const base64Input = hasInput ? Buffer.from(normalizedInput, 'utf-8').toString('base64') : null;
      const runCommand = this.buildRunCommand(languageConfig, fileName, hasInput);

      // Always start by writing the source file into /tmp
      commandParts.push(`echo '${base64Code}' | base64 -d > /tmp/${fileName}`);

      if (languageConfig.type === 'compiled' || languageConfig.type === 'transpiled') {
        const compileCmd = languageConfig.compileCommand.replace('/tmp/code', `/tmp/${fileName.split('.')[0]}`);
        commandParts.push(compileCmd);
      }

      if (base64Input) {
        commandParts.push(`echo '${base64Input}' | base64 -d > /tmp/input.txt`);
      }

      commandParts.push(runCommand);

      containerConfig.Cmd = ['sh', '-c', commandParts.join(' && ')];
    }

    const container = await this.docker.createContainer(containerConfig);
    return container;
  }

  async createInteractiveContainer(languageConfig) {
    const sessionId = uuidv4();
    let container = null;

    try {
      await this.testConnection();

      const containerConfig = {
        Image: languageConfig.image,
        name: `code-terminal-${sessionId}`,
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        NetworkMode: 'none',
        User: 'nobody',
        WorkingDir: '/tmp',
        Env: [
          'HOME=/tmp',
          'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          'PS1=user@codejoin:~$ ',
          'TERM=xterm',
          'SHELL=/bin/sh'
        ],
        Cmd: ['/bin/sh', '-l'],
        HostConfig: {
          Memory: this.parseMemoryLimit(languageConfig.memoryLimit || '256m'),
          CpuQuota: Math.floor((languageConfig.cpuLimit || 0.5) * 100000),
          CpuPeriod: 100000,
          PidsLimit: 64,
          ReadonlyRootfs: false,
          Tmpfs: {
            '/tmp': 'rw,exec,nosuid,size=100m',
            '/var/tmp': 'rw,noexec,nosuid,size=10m'
          },
          SecurityOpt: [
            'no-new-privileges:true'
          ],
          CapDrop: ['ALL']
        }
      };

      container = await this.docker.createContainer(containerConfig);
      await container.start();

      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        tty: true
      });

      this.runningContainers.set(sessionId, container);

      logger.info('Started interactive terminal container', {
        sessionId,
        image: languageConfig.image
      });

      return { sessionId, stream };
    } catch (error) {
      logger.error(`Failed to start interactive container: ${error.message}`, { sessionId });
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (cleanupError) {
          logger.warn(`Failed to remove interactive container: ${cleanupError.message}`);
        }
      }
      throw error;
    }
  }

  async attachInteractiveStream(sessionId) {
    let container = this.runningContainers.get(sessionId);

    if (!container) {
      container = this.docker.getContainer(`code-terminal-${sessionId}`);
      try {
        const inspection = await container.inspect();
        if (!inspection?.State?.Running) {
          throw new Error('Interactive session is not running');
        }
        this.runningContainers.set(sessionId, container);
      } catch (error) {
        throw new Error(
          `Unable to resume interactive session: ${error.message || error}`
        );
      }
    } else {
      try {
        const inspection = await container.inspect();
        if (!inspection?.State?.Running) {
          this.runningContainers.delete(sessionId);
          throw new Error('Interactive session has already exited');
        }
      } catch (error) {
        this.runningContainers.delete(sessionId);
        throw new Error(
          `Unable to inspect interactive session: ${error.message || error}`
        );
      }
    }

    try {
      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        tty: true
      });

      return { stream };
    } catch (error) {
      throw new Error(
        `Failed to attach to interactive session: ${error.message || error}`
      );
    }
  }

  async copyCodeToContainer(container, fileName, code) {
    const tar = require('tar-stream');
    const pack = tar.pack();

    pack.entry({ name: fileName }, code);
    pack.finalize();

    await container.putArchive(pack, { path: '/tmp' });
  }

  async runContainer(container, languageConfig) {
    const startTime = Date.now();
    let output = '';
    let error = '';
    let exitCode = 0;

    try {
      await container.start();

      // Set up timeout promise
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ timedOut: true });
        }, languageConfig.timeout);
      });

      // Wait for container to complete or timeout
      const resultPromise = container.wait();
      const result = await Promise.race([resultPromise, timeoutPromise]);

      if (result.timedOut) {
        try {
          await container.kill();
        } catch (e) {
          logger.warn(`Failed to kill timed out container: ${e.message}`);
        }
        error = 'Execution timed out';
        exitCode = 124;
      } else {
        exitCode = result.StatusCode || 0;
      }

      // Get logs from container
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: false
      });

      // Parse logs
      const parsedOutput = this.parseDockerStream(logs);
      output = parsedOutput.stdout;
      if (!result.timedOut) {
        error = parsedOutput.stderr;
      }

    } catch (e) {
      error = `Container execution error: ${e.message}`;
      exitCode = 1;
    }

    const executionTime = Date.now() - startTime;

    return {
      output: this.sanitizeOutput(output),
      error: this.sanitizeOutput(error),
      exitCode,
      executionTime
    };
  }

  extractDockerErrorDetails(error) {
    const details = {};

    const mergeField = (key, value) => {
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'string' && key !== 'stack') {
        const trimmed = value.trim();
        if (!trimmed) {
          return;
        }
        value = trimmed;
      }

      if (details[key] === undefined) {
        details[key] = value;
      }
    };

    const mergeFrom = (source) => {
      if (!source || typeof source !== 'object') {
        return;
      }

      mergeField('message', source.message);
      mergeField('reason', source.reason);
      mergeField('code', source.code);
      mergeField('errno', source.errno);
      mergeField('syscall', source.syscall);
      mergeField('address', source.address);
      mergeField('port', source.port);

      if (details.stack === undefined && source.stack) {
        details.stack = source.stack;
      }
    };

    if (error?.dockerDetails) {
      mergeFrom(error.dockerDetails);
    }

    mergeFrom(error);

    if (error?.cause) {
      mergeFrom(error.cause);
    }

    if (!details.message && typeof details.reason === 'string') {
      details.message = details.reason;
    }

    return details;
  }

  composeDockerErrorMessage(details, options = {}) {
    const { prefix = '' } = options || {};
    if (!details || typeof details !== 'object') {
      const fallbackMessage = 'Unknown Docker error';
      return prefix ? `${prefix}${fallbackMessage}` : fallbackMessage;
    }

    const baseCandidates = [];
    if (typeof details.message === 'string') {
      const message = details.message.trim();
      if (message) {
        baseCandidates.push(message);
      }
    }
    if (typeof details.reason === 'string') {
      const reason = details.reason.trim();
      if (reason) {
        baseCandidates.push(reason);
      }
    }

    const baseMessage = baseCandidates.find((candidate) => candidate && candidate.length > 0) || 'Unknown Docker error';

    const extras = [];
    const seen = new Set();

    const addExtra = (value) => {
      if (!value && value !== 0) {
        return;
      }
      const stringValue = typeof value === 'string' ? value.trim() : String(value).trim();
      if (!stringValue || seen.has(stringValue) || baseMessage.includes(stringValue)) {
        return;
      }
      seen.add(stringValue);
      extras.push(stringValue);
    };

    const appendLabeled = (value, label) => {
      if (value === undefined || value === null) {
        return;
      }
      const stringValue = typeof value === 'string' ? value.trim() : String(value).trim();
      if (!stringValue) {
        return;
      }
      const formatted = `${label}: ${stringValue}`;
      if (seen.has(formatted) || baseMessage.includes(formatted)) {
        return;
      }
      seen.add(formatted);
      extras.push(formatted);
    };

    if (typeof details.reason === 'string') {
      const trimmedReason = details.reason.trim();
      if (trimmedReason && !baseMessage.includes(trimmedReason)) {
        addExtra(trimmedReason);
      }
    }

    appendLabeled(details.code, 'code');
    appendLabeled(details.errno, 'errno');
    appendLabeled(details.syscall, 'syscall');
    appendLabeled(details.address, 'address');
    appendLabeled(details.port, 'port');

    const message = extras.length ? `${baseMessage} (${extras.join(', ')})` : baseMessage;

    return prefix ? `${prefix}${message}` : message;
  }

  isDockerConnectionIssue(...messages) {
    const needles = ['enoent', 'connect', 'econnrefused', 'docker.sock'];
    return messages
      .filter((message) => typeof message === 'string')
      .some((message) => {
        const normalized = message.toLowerCase();
        return needles.some((needle) => normalized.includes(needle));
      });
  }

  parseDockerStream(buffer) {
    let stdout = '';
    let stderr = '';
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) break;

      const header = buffer.slice(offset, offset + 8);
      const streamType = header[0];
      const size = header.readUInt32BE(4);

      if (offset + 8 + size > buffer.length) break;

      const content = buffer.slice(offset + 8, offset + 8 + size).toString();

      if (streamType === 1) {
        stdout += content;
      } else if (streamType === 2) {
        stderr += content;
      }

      offset += 8 + size;
    }

    return { stdout, stderr };
  }

  getFileName(languageConfig) {
    if (languageConfig.className) {
      return `${languageConfig.className}${languageConfig.fileExtension}`;
    }
    return `code${languageConfig.fileExtension}`;
  }

  prepareCode(code, languageConfig) {
    // For Java, ensure the class name matches our expected name
    if (languageConfig.name === 'Java') {
      // Simple regex to replace class name with 'Main'
      code = code.replace(/public\s+class\s+\w+/g, 'public class Main');
    }

    return code;
  }

  buildRunCommand(languageConfig, fileName, hasInput) {
    if (languageConfig.name === 'SQL') {
      return languageConfig.runCommand;
    }

    if (languageConfig.type === 'interpreted') {
      const needsSourceArg = !languageConfig.runCommand.includes('/tmp/');
      const commandWithSource = needsSourceArg
        ? `${languageConfig.runCommand} /tmp/${fileName}`
        : languageConfig.runCommand;
      return hasInput
        ? `cat /tmp/input.txt | ${commandWithSource}`
        : commandWithSource;
    }

    const compiledRunCmd = languageConfig.runCommand;
    return hasInput
      ? `cat /tmp/input.txt | ${compiledRunCmd}`
      : compiledRunCmd;
  }

  normalizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }

    const trimmed = input.replace(/\r\n/g, '\n');
    if (trimmed.length === 0) {
      return '';
    }

    return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
  }

  parseMemoryLimit(limit) {
    // Convert memory limit string to bytes
    const unit = limit.slice(-1).toLowerCase();
    const value = parseInt(limit.slice(0, -1));

    switch (unit) {
      case 'k': return value * 1024;
      case 'm': return value * 1024 * 1024;
      case 'g': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  sanitizeOutput(output) {
    // Remove or replace potentially dangerous output
    return output
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 10000); // Limit output size
  }

  async cleanup(containerId, container) {
    try {
      // Remove from tracking
      this.runningContainers.delete(containerId);

      if (container) {
        // Container should auto-remove, but force if needed
        try {
          await container.remove({ force: true });
        } catch (e) {
          // Container might already be removed
          logger.debug(`Container cleanup: ${e.message}`);
        }
      }
    } catch (error) {
      logger.error(`Cleanup error: ${error.message}`, { containerId });
    }
  }

  async cleanupAll() {
    const promises = Array.from(this.runningContainers.entries()).map(([id, container]) =>
      this.cleanup(id, container)
    );

    await Promise.allSettled(promises);
  }

  async resizeInteractiveContainer(sessionId, dimensions) {
    const container = this.runningContainers.get(sessionId);
    if (!container) {
      throw new Error(`No interactive container found for session ${sessionId}`);
    }

    const cols = Number(dimensions?.cols);
    const rows = Number(dimensions?.rows);

    if (!Number.isFinite(cols) || !Number.isFinite(rows)) {
      return;
    }

    if (cols <= 0 || rows <= 0) {
      return;
    }

    try {
      await container.resize({ w: Math.floor(cols), h: Math.floor(rows) });
      logger.debug('Resized interactive container', { sessionId, cols, rows });
    } catch (error) {
      logger.warn(`Failed to resize interactive container ${sessionId}: ${error.message}`);
      throw new Error(`Failed to resize interactive container: ${error.message}`);
    }
  }

  async stopInteractiveContainer(sessionId) {
    const container = this.runningContainers.get(sessionId);
    if (!container) {
      return;
    }

    try {
      await container.stop({ t: 0 });
    } catch (error) {
      if (!String(error.message).includes('not running')) {
        logger.warn(`Failed to stop interactive container: ${error.message}`, { sessionId });
      }
    } finally {
      await this.cleanup(sessionId, container);
    }
  }

  async waitForContainer(sessionId) {
    const container = this.runningContainers.get(sessionId);
    if (!container) {
      return null;
    }

    try {
      const status = await container.wait();
      return status;
    } catch (error) {
      logger.warn(`Error while waiting for container ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  async pullImages(languages) {
    const pullPromises = languages.map(async (lang) => {
      try {
        logger.info(`Pulling Docker image: ${lang.image}`);
        await this.docker.pull(lang.image);
        logger.info(`Successfully pulled: ${lang.image}`);
      } catch (error) {
        logger.error(`Failed to pull image ${lang.image}: ${error.message}`);
        throw error;
      }
    });

    await Promise.allSettled(pullPromises);
  }

  async getSystemInfo() {
    try {
      const info = await this.docker.info();
      return {
        dockerVersion: info.ServerVersion,
        containers: info.Containers,
        images: info.Images,
        memoryLimit: info.MemTotal,
        cpuCount: info.NCPU
      };
    } catch (error) {
      logger.error(`Failed to get Docker info: ${error.message}`);
      throw error;
    }
  }

  getUlimitsForLanguage(languageConfig) {
    // Language-specific ulimits to handle different compilation requirements
    const defaultUlimits = [
      { Name: 'nofile', Soft: 64, Hard: 64 }, // File descriptor limit
      { Name: 'nproc', Soft: 32, Hard: 32 }   // Process limit
    ];

    // Go compiler needs more file descriptors and processes
    if (languageConfig.name === 'Go') {
      return [
        { Name: 'nofile', Soft: 256, Hard: 256 }, // Higher file descriptor limit for Go
        { Name: 'nproc', Soft: 128, Hard: 128 }   // Higher process limit for Go
      ];
    }

    return defaultUlimits;
  }
}

module.exports = DockerService;

