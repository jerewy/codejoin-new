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
      container = await this.createSecureContainer(languageConfig, code, containerId);

      // Store reference for cleanup
      this.runningContainers.set(containerId, container);

      // Start container and capture output
      const result = await this.runContainer(container, languageConfig, input);

      return {
        success: true,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime
      };

    } catch (error) {
      logger.error(`Docker execution error: ${error.message}`, { containerId, error });

      let errorMessage = error.message;

      // Provide better error messages for common issues
      if (error.message.includes('ENOENT') || error.message.includes('connect')) {
        errorMessage = 'Docker is not running or not accessible. Please start Docker Desktop and try again.';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Permission denied accessing Docker. Make sure your user has access to Docker.';
      } else if (error.message.includes('no such image')) {
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
      logger.error('Docker connection test failed', { error: error.message });
      throw new Error(`Docker connection failed: ${error.message}`);
    }
  }

  async createSecureContainer(languageConfig, code, containerId) {
    const fileName = this.getFileName(languageConfig);
    const codeContent = this.prepareCode(code, languageConfig);

    // Security-focused container configuration
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
        PidsLimit: 64, // Limit number of processes
        ReadonlyRootfs: false, // Need write access for compilation
        Tmpfs: {
          '/tmp': 'rw,exec,nosuid,size=100m',
          '/var/tmp': 'rw,noexec,nosuid,size=10m'
        },
        Ulimits: [
          { Name: 'nofile', Soft: 64, Hard: 64 }, // File descriptor limit
          { Name: 'nproc', Soft: 32, Hard: 32 }   // Process limit
        ],
        SecurityOpt: [
          'no-new-privileges:true'
        ],
        CapDrop: ['ALL'] // Drop all capabilities
      }
    };

    // Set up the execution command - embed code directly to avoid file copying issues
    const escapedCode = codeContent.replace(/'/g, "'\"'\"'"); // Escape single quotes

    if (languageConfig.type === 'compiled') {
      // For compiled languages, create file, compile and run
      const compileCmd = languageConfig.compileCommand.replace('/tmp/code', `/tmp/${fileName.split('.')[0]}`);
      const runCmd = languageConfig.runCommand;
      containerConfig.Cmd = ['sh', '-c', `echo '${escapedCode}' > /tmp/${fileName} && ${compileCmd} && ${runCmd}`];
    } else {
      // For interpreted languages, create file and run
      containerConfig.Cmd = ['sh', '-c', `echo '${escapedCode}' > /tmp/${fileName} && ${languageConfig.runCommand} /tmp/${fileName}`];
    }

    const container = await this.docker.createContainer(containerConfig);
    return container;
  }

  async copyCodeToContainer(container, fileName, code) {
    const tar = require('tar-stream');
    const pack = tar.pack();

    pack.entry({ name: fileName }, code);
    pack.finalize();

    await container.putArchive(pack, { path: '/tmp' });
  }

  async runContainer(container, languageConfig, input) {
    const startTime = Date.now();
    let output = '';
    let error = '';
    let exitCode = 0;

    try {
      // Start container and wait for completion
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

  getCompileAndRunCommand(languageConfig, fileName) {
    const compileCmd = languageConfig.compileCommand.replace('/tmp/code', `/tmp/${fileName.split('.')[0]}`);
    const runCmd = languageConfig.runCommand;

    return `${compileCmd} && ${runCmd}`;
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
}

module.exports = DockerService;