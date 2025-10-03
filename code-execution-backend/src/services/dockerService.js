const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DockerService {
  constructor() {
    const { primary, fallback } = this.buildDockerOptions();

    this.dockerOptions = primary;
    this.fallbackDockerOptions = fallback;
    this.hasRetriedConnection = false;

    this.docker = new Docker(this.dockerOptions);
    this.runningContainers = new Map();

    logger.info('Docker service initialized', {
      platform: process.platform,
      options: JSON.stringify(this.dockerOptions, null, 2)
    });
  }

  buildDockerOptions() {
    const dockerHost = process.env.DOCKER_HOST || '';
    const isWindows = process.platform === 'win32';
    const defaultSocketPath = isWindows
      ? process.env.DOCKER_SOCKET || '//./pipe/docker_engine'
      : '/var/run/docker.sock';
    const defaultOptions = { socketPath: defaultSocketPath };

    if (!dockerHost) {
      return {
        primary: defaultOptions,
        fallback: null
      };
    }

    try {
      if (dockerHost.startsWith('unix://')) {
        const socketPath = dockerHost.replace(/^unix:\/\//, '') || defaultSocketPath;

        return {
          primary: { socketPath },
          fallback: defaultOptions
        };
      }

      if (dockerHost.startsWith('tcp://')) {
        const url = new URL(dockerHost);
        const normalizedProtocol = url.protocol.replace(':', '');

        const tcpOptions = {
          host: url.hostname,
          port: url.port ? parseInt(url.port, 10) : 2375,
          protocol: normalizedProtocol === 'tcp' ? 'http' : normalizedProtocol || 'http'
        };

        return {
          primary: tcpOptions,
          fallback: defaultOptions
        };
      }

      if (isWindows && dockerHost.startsWith('npipe://')) {
        const pipePath = dockerHost.replace(/^npipe:\/\//, '');
        const normalizedPath = pipePath.startsWith('\\\\')
          ? pipePath
          : `//${pipePath.replace(/^\/+/g, '')}`;

        return {
          primary: { socketPath: normalizedPath },
          fallback: defaultOptions
        };
      }
    } catch (error) {
      logger.warn('Failed to parse DOCKER_HOST, falling back to default Docker options', {
        dockerHost,
        error: error.message
      });
    }

    return {
      primary: defaultOptions,
      fallback: null
    };
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
      const rawMessage = error && error.message ? error.message : 'Unknown error';
      const errorCode = error && error.code ? error.code : undefined;

      const isPermissionError =
        errorCode === 'EPERM' ||
        errorCode === 'EACCES' ||
        /permission denied/i.test(rawMessage) ||
        /Access is denied/i.test(rawMessage);

      let errorMessage = rawMessage;

      if (isPermissionError) {
        logger.error('Docker permission error during execution', {
          containerId,
          errorCode,
          errorMessage: rawMessage,
          guidance: 'Ensure your user can access the Docker socket/pipe (e.g., add to "docker-users" on Windows).'
        });
        errorMessage = 'Permission denied accessing Docker. On Windows, add your user to the "docker-users" group or grant access to the Docker pipe, then restart Docker Desktop.';
      } else if (rawMessage.includes('ENOENT') || rawMessage.includes('connect')) {
        logger.error('Docker connection error during execution', {
          containerId,
          errorCode,
          errorMessage: rawMessage
        });
        errorMessage = 'Docker is not running or not accessible. Please start Docker Desktop and try again.';
      } else if (rawMessage.includes('no such image')) {
        logger.error('Docker image missing during execution', {
          containerId,
          errorCode,
          errorMessage: rawMessage,
          image: languageConfig.image
        });
        errorMessage = `Docker image '${languageConfig.image}' not found. Please pull the required images.`;
      } else {
        logger.error(`Docker execution error: ${rawMessage}`, {
          containerId,
          errorCode,
          errorMessage: rawMessage
        });
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
      const message = error && error.message ? error.message : 'Unknown error';
      logger.error('Docker connection test failed', { error: message });

      if (!this.hasRetriedConnection && this.fallbackDockerOptions) {
        this.hasRetriedConnection = true;
        logger.warn('Retrying Docker connection with fallback options', {
          options: JSON.stringify(this.fallbackDockerOptions, null, 2)
        });

        this.docker = new Docker(this.fallbackDockerOptions);

        try {
          await this.docker.ping();
          logger.info('Docker fallback connection successful');
          return;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError && fallbackError.message
            ? fallbackError.message
            : 'Unknown error';
          logger.error('Docker fallback connection failed', { error: fallbackMessage });
          fallbackError.message = `Docker connection failed: ${fallbackMessage}`;
          throw fallbackError;
        }
      }

      error.message = `Docker connection failed: ${message}`;
      throw error;
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
      OpenStdin: true,
      StdinOnce: true,
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

