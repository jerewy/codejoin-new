const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DockerService {
  constructor() {
    this.docker = new Docker();
    this.runningContainers = new Map();
  }

  async executeCode(languageConfig, code, input = '') {
    const containerId = uuidv4();
    let container = null;

    try {
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
      return {
        success: false,
        output: '',
        error: error.message,
        exitCode: 1,
        executionTime: 0
      };
    } finally {
      // Always cleanup
      await this.cleanup(containerId, container);
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
          '/tmp': 'rw,noexec,nosuid,size=100m',
          '/var/tmp': 'rw,noexec,nosuid,size=10m'
        },
        Ulimits: [
          { Name: 'nofile', Soft: 64, Hard: 64 }, // File descriptor limit
          { Name: 'nproc', Soft: 32, Hard: 32 }   // Process limit
        ],
        SecurityOpt: [
          'no-new-privileges:true'
        ],
        CapDrop: ['ALL'], // Drop all capabilities
        AutoRemove: true
      }
    };

    // Set up the execution command
    if (languageConfig.type === 'compiled') {
      // For compiled languages, we need to compile first then run
      containerConfig.Cmd = ['/bin/sh', '-c', this.getCompileAndRunCommand(languageConfig, fileName)];
    } else {
      // For interpreted languages, run directly
      containerConfig.Cmd = [languageConfig.runCommand, fileName];
    }

    const container = await this.docker.createContainer(containerConfig);

    // Copy code file into container
    await this.copyCodeToContainer(container, fileName, codeContent);

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

    // Start the container
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true
    });

    await container.start();

    // Set up timeout
    const timeout = setTimeout(async () => {
      try {
        await container.kill();
        error += '\nExecution timed out';
      } catch (e) {
        logger.warn(`Failed to kill timed out container: ${e.message}`);
      }
    }, languageConfig.timeout);

    // Handle stdin if input is provided
    if (input) {
      stream.write(input);
    }
    stream.end();

    // Capture output
    return new Promise((resolve) => {
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        clearTimeout(timeout);

        try {
          const result = await container.wait();
          exitCode = result.StatusCode;

          // Parse Docker stream format
          const parsedOutput = this.parseDockerStream(Buffer.concat(chunks));
          output = parsedOutput.stdout;
          error += parsedOutput.stderr;

        } catch (e) {
          error += `Container wait error: ${e.message}`;
          exitCode = 1;
        }

        const executionTime = Date.now() - startTime;

        resolve({
          output: this.sanitizeOutput(output),
          error: this.sanitizeOutput(error),
          exitCode,
          executionTime
        });
      });
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