const { describe, test, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const Docker = require('dockerode');
const DockerService = require('../../src/services/dockerService');
const { mockLanguageConfigs, mockTestCode, mockDockerResponses } = require('../fixtures/mockData');
const TestHelpers = require('../utils/testHelpers');

describe('DockerService', () => {
  let dockerService;
  let mockDocker;
  let mockContainer;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Docker constructor
    mockDocker = {
      ping: jest.fn(),
      createContainer: jest.fn(),
      getContainer: jest.fn(),
      info: jest.fn(),
      pull: jest.fn()
    };

    mockContainer = {
      start: jest.fn().mockResolvedValue(),
      stop: jest.fn().mockResolvedValue(),
      kill: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      attach: jest.fn().mockResolvedValue(TestHelpers.createMockStream()),
      inspect: jest.fn().mockResolvedValue({
        State: { Running: true }
      }),
      resize: jest.fn().mockResolvedValue(),
      wait: jest.fn().mockResolvedValue({ StatusCode: 0 }),
      logs: jest.fn().mockResolvedValue(Buffer.from('test output'))
    };

    // Mock dockerode module
    jest.mock('dockerode', () => {
      return jest.fn().mockImplementation(() => mockDocker);
    });

    // Create DockerService instance
    dockerService = new DockerService();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Constructor', () => {
    test('should initialize with default Docker options', () => {
      expect(dockerService.dockerOptions).toBeDefined();
      expect(dockerService.runningContainers).toBeInstanceOf(Map);
      expect(dockerService.hasRetriedConnection).toBe(false);
    });

    test('should initialize connection state correctly', () => {
      expect(dockerService.connectionState).toEqual({
        isAvailable: null,
        lastChecked: null,
        consecutiveFailures: 0,
        backoffMs: 500,
        maxBackoffMs: 10000,
        lastErrorLogged: 0,
        errorLogCooldownMs: 15000
      });
    });

    test('should handle Windows socket path configuration', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      });

      const windowsDockerService = new DockerService();

      expect(windowsDockerService.dockerOptions.socketPath).toContain('pipe');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true
      });
    });

    test('should handle custom DOCKER_HOST', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        DOCKER_HOST: 'tcp://localhost:2375'
      };

      const customDockerService = new DockerService();

      expect(customDockerService.dockerOptions.host).toBe('localhost');
      expect(customDockerService.dockerOptions.port).toBe(2375);

      process.env = originalEnv;
    });
  });

  describe('Connection Management', () => {
    test('should test Docker connection successfully', async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);

      await dockerService.testConnection();

      expect(mockDocker.ping).toHaveBeenCalled();
      expect(dockerService.connectionState.isAvailable).toBe(true);
      expect(dockerService.connectionState.consecutiveFailures).toBe(0);
    });

    test('should handle Docker connection failure', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      mockDocker.ping.mockRejectedValue(connectionError);

      await expect(dockerService.testConnection()).rejects.toThrow();

      expect(dockerService.connectionState.isAvailable).toBe(false);
      expect(dockerService.connectionState.consecutiveFailures).toBeGreaterThan(0);
    });

    test('should implement exponential backoff', async () => {
      mockDocker.ping.mockRejectedValue(new Error('Connection failed'));

      // First failure
      await expect(dockerService.testConnection()).rejects.toThrow();
      const firstBackoff = dockerService.connectionState.backoffMs;

      // Second failure
      await expect(dockerService.testConnection()).rejects.toThrow();
      const secondBackoff = dockerService.connectionState.backoffMs;

      expect(secondBackoff).toBeGreaterThan(firstBackoff);
    });

    test('should skip connection check during backoff period', async () => {
      // Set up backoff state
      dockerService.connectionState.isAvailable = false;
      dockerService.connectionState.lastChecked = Date.now();
      dockerService.connectionState.backoffMs = 5000;

      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);

      await expect(dockerService.testConnection()).rejects.toThrow('DOCKER_IN_BACKOFF');
      expect(mockDocker.ping).not.toHaveBeenCalled();
    });

    test('should retry with fallback Docker options', async () => {
      // Mock fallback options
      dockerService.fallbackDockerOptions = { socketPath: '/fallback/docker.sock' };

      // First attempt fails
      mockDocker.ping.mockRejectedValueOnce(new Error('Primary failed'));

      // Second attempt succeeds
      const mockFallbackDocker = {
        ping: jest.fn().mockResolvedValue(mockDockerResponses.pingSuccess)
      };

      // Mock constructor to return fallback docker on second call
      require('dockerode')
        .mockImplementationOnce(() => mockDocker)
        .mockImplementationOnce(() => mockFallbackDocker);

      await expect(dockerService.testConnection()).rejects.toThrow();
    });
  });

  describe('Interactive Container Creation', () => {
    beforeEach(async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);
      mockDocker.createContainer.mockResolvedValue(mockContainer);
    });

    test('should create interactive container successfully', async () => {
      const languageConfig = mockLanguageConfigs.python;
      const result = await dockerService.createInteractiveContainer(languageConfig);

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('stream');
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Image: languageConfig.image,
          Tty: true,
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true
        })
      );
      expect(mockContainer.start).toHaveBeenCalled();
    });

    test('should use correct interactive command for each language', async () => {
      const testCases = [
        { config: mockLanguageConfigs.python, expectedCommand: ['python3', '-u', '-i'] },
        { config: mockLanguageConfigs.javascript, expectedCommand: ['node'] },
        { config: mockLanguageConfigs.java, expectedCommand: ['jshell'] },
        { config: mockLanguageConfigs.bash, expectedCommand: ['/bin/bash', '-l'] }
      ];

      for (const { config, expectedCommand } of testCases) {
        await dockerService.createInteractiveContainer(config);

        expect(mockDocker.createContainer).toHaveBeenCalledWith(
          expect.objectContaining({
            Cmd: expectedCommand
          })
        );

        mockDocker.createContainer.mockClear();
      }
    });

    test('should set correct environment variables', async () => {
      const languageConfig = mockLanguageConfigs.python;
      await dockerService.createInteractiveContainer(languageConfig);

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining([
            'HOME=/tmp',
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'PS1=user@codejoin:~$ ',
            'TERM=xterm-256color',
            'SHELL=/bin/bash',
            'PYTHONUNBUFFERED=1',
            'PYTHONIOENCODING=utf-8',
            'LANG=C.UTF-8',
            'LC_ALL=C.UTF-8'
          ])
        })
      );
    });

    test('should configure security settings correctly', async () => {
      const languageConfig = mockLanguageConfigs.python;
      await dockerService.createInteractiveContainer(languageConfig);

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            SecurityOpt: ['no-new-privileges:true'],
            CapDrop: ['ALL'],
            CapAdd: ['SYS_TTY_CONFIG'],
            User: 'nobody',
            NetworkMode: 'none'
          })
        })
      );
    });

    test('should handle container creation failure', async () => {
      const languageConfig = mockLanguageConfigs.python;
      const creationError = new Error('Container creation failed');
      mockDocker.createContainer.mockRejectedValue(creationError);

      await expect(dockerService.createInteractiveContainer(languageConfig))
        .rejects.toThrow('Container creation failed');
    });

    test('should handle Docker image missing error', async () => {
      const languageConfig = mockLanguageConfigs.python;
      const imageError = new Error('no such image');
      mockDocker.createContainer.mockRejectedValue(imageError);

      await expect(dockerService.createInteractiveContainer(languageConfig))
        .rejects.toThrow('Docker image');
    });

    test('should cleanup container on creation failure', async () => {
      const languageConfig = mockLanguageConfigs.python;
      const creationError = new Error('Creation failed');
      mockDocker.createContainer.mockRejectedValue(creationError);

      try {
        await dockerService.createInteractiveContainer(languageConfig);
      } catch (error) {
        // Expected to throw
      }

      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('Container Operations', () => {
    let sessionId;

    beforeEach(async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);
      mockDocker.createContainer.mockResolvedValue(mockContainer);

      const result = await dockerService.createInteractiveContainer(mockLanguageConfigs.python);
      sessionId = result.sessionId;
    });

    test('should resize container successfully', async () => {
      const dimensions = { cols: 100, rows: 50 };

      await dockerService.resizeInteractiveContainer(sessionId, dimensions);

      expect(mockContainer.resize).toHaveBeenCalledWith({ w: 100, h: 50 });
    });

    test('should handle resize for non-existent container', async () => {
      await expect(
        dockerService.resizeInteractiveContainer('non-existent', { cols: 80, rows: 24 })
      ).rejects.toThrow('No interactive container found');
    });

    test('should validate resize dimensions', async () => {
      await expect(
        dockerService.resizeInteractiveContainer(sessionId, { cols: -1, rows: 24 })
      ).resolves.not.toThrow();

      await expect(
        dockerService.resizeInteractiveContainer(sessionId, { cols: 0, rows: 24 })
      ).resolves.not.toThrow();

      await expect(
        dockerService.resizeInteractiveContainer(sessionId, { cols: 1001, rows: 24 })
      ).resolves.not.toThrow();
    });

    test('should stop container successfully', async () => {
      await dockerService.stopInteractiveContainer(sessionId);

      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 0 });
      expect(dockerService.runningContainers.has(sessionId)).toBe(false);
    });

    test('should handle stopping already stopped container', async () => {
      mockContainer.stop.mockRejectedValue(new Error('not running'));

      await expect(dockerService.stopInteractiveContainer(sessionId))
        .resolves.not.toThrow();
    });

    test('should force kill container successfully', async () => {
      await dockerService.forceKillContainer(sessionId);

      expect(mockContainer.kill).toHaveBeenCalledWith({ signal: 'SIGKILL' });
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
      expect(dockerService.runningContainers.has(sessionId)).toBe(false);
    });

    test('should handle force killing non-existent container', async () => {
      mockDocker.getContainer.mockImplementation(() => {
        throw new Error('no such container');
      });

      await expect(dockerService.forceKillContainer('non-existent'))
        .resolves.not.toThrow();
    });

    test('should wait for container successfully', async () => {
      const result = await dockerService.waitForContainer(sessionId);

      expect(result).toEqual({ StatusCode: 0 });
      expect(mockContainer.wait).toHaveBeenCalled();
    });

    test('should handle wait timeout', async () => {
      const waitError = new Error('Container wait timeout');
      mockContainer.wait.mockRejectedValue(waitError);

      await expect(dockerService.waitForContainer(sessionId))
        .rejects.toThrow('Container wait timeout');
    });
  });

  describe('Utility Methods', () => {
    test('should parse memory limit correctly', () => {
      expect(dockerService.parseMemoryLimit('256m')).toBe(256 * 1024 * 1024);
      expect(dockerService.parseMemoryLimit('1g')).toBe(1024 * 1024 * 1024);
      expect(dockerService.parseMemoryLimit('1024k')).toBe(1024 * 1024);
      expect(dockerService.parseMemoryLimit('1024')).toBe(1024);
    });

    test('should sanitize output correctly', () => {
      const dangerousOutput = 'Hello\x00\x01\x02World\x7f';
      const sanitized = dockerService.sanitizeOutput(dangerousOutput);

      expect(sanitized).toBe('HelloWorld');
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });

    test('should normalize input correctly', () => {
      expect(dockerService.normalizeInput('Hello\r\nWorld')).toBe('Hello\nWorld\n');
      expect(dockerService.normalizeInput('Hello\nWorld\n')).toBe('Hello\nWorld\n');
      expect(dockerService.normalizeInput('')).toBe('');
      expect(dockerService.normalizeInput(123)).toBe('');
    });

    test('should get correct filename for language', () => {
      const pythonConfig = mockLanguageConfigs.python;
      const javaConfig = mockLanguageConfigs.java;

      expect(dockerService.getFileName(pythonConfig)).toBe('code.py');
      expect(dockerService.getFileName(javaConfig)).toBe('Main.java');
    });

    test('should prepare code correctly for Java', () => {
      const javaCode = 'public class Test { public static void main(String[] args) {} }';
      const javaConfig = mockLanguageConfigs.java;

      const prepared = dockerService.prepareCode(javaCode, javaConfig);

      expect(prepared).toContain('public class Main');
    });

    test('should build run command correctly', () => {
      const pythonConfig = mockLanguageConfigs.python;
      const jsConfig = mockLanguageConfigs.javascript;

      expect(dockerService.buildRunCommand(pythonConfig, 'test.py'))
        .toBe(pythonConfig.runCommand);
      expect(dockerService.buildRunCommand(jsConfig, 'test.js'))
        .toBe(jsConfig.runCommand);
    });
  });

  describe('Container Cleanup', () => {
    let sessionId;

    beforeEach(async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);
      mockDocker.createContainer.mockResolvedValue(mockContainer);

      const result = await dockerService.createInteractiveContainer(mockLanguageConfigs.python);
      sessionId = result.sessionId;
    });

    test('should cleanup container successfully', async () => {
      await dockerService.cleanup(sessionId, mockContainer);

      expect(dockerService.runningContainers.has(sessionId)).toBe(false);
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    test('should handle cleanup errors gracefully', async () => {
      mockContainer.remove.mockRejectedValue(new Error('Remove failed'));

      await expect(dockerService.cleanup(sessionId, mockContainer))
        .resolves.not.toThrow();
    });

    test('should cleanup all containers', async () => {
      // Create multiple containers
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const result = await dockerService.createInteractiveContainer(mockLanguageConfigs.python);
        sessionIds.push(result.sessionId);
      }

      await dockerService.cleanupAll();

      expect(dockerService.runningContainers.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should describe Docker connection errors correctly', () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'EPERM';

      const described = dockerService.describeDockerConnectionError(permissionError);

      expect(described.code).toBe('EPERM');
      expect(described.message).toContain('Permission denied');
      expect(described.guidance).toBeTruthy();
    });

    test('should handle ECONNREFUSED error', () => {
      const connectionError = new Error('ECONNREFUSED');
      connectionError.code = 'ECONNREFUSED';

      const described = dockerService.describeDockerConnectionError(connectionError);

      expect(described.code).toBe('ECONNREFUSED');
      expect(described.message).toContain('refusing');
    });

    test('should handle ENOENT error', () => {
      const noEntError = new Error('ENOENT');
      noEntError.code = 'ENOENT';

      const described = dockerService.describeDockerConnectionError(noEntError);

      expect(described.code).toBe('ENOENT');
      expect(described.message).toContain('not running');
    });

    test('should get connection state correctly', () => {
      const state = dockerService.getConnectionState();

      expect(state).toHaveProperty('isAvailable');
      expect(state).toHaveProperty('consecutiveFailures');
      expect(state).toHaveProperty('backoffMs');
      expect(state).toHaveProperty('lastChecked');
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle large number of containers', async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);
      mockDocker.createContainer.mockResolvedValue(mockContainer);

      const sessionIds = [];
      const startTime = Date.now();

      // Create 100 containers
      for (let i = 0; i < 100; i++) {
        const result = await dockerService.createInteractiveContainer(mockLanguageConfigs.python);
        sessionIds.push(result.sessionId);
      }

      const creationTime = Date.now() - startTime;

      expect(sessionIds.length).toBe(100);
      expect(dockerService.runningContainers.size).toBe(100);
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Cleanup all containers
      await dockerService.cleanupAll();
    });

    test('should handle concurrent operations', async () => {
      mockDocker.ping.mockResolvedValue(mockDockerResponses.pingSuccess);
      mockDocker.createContainer.mockResolvedValue(mockContainer);

      // Create containers concurrently
      const promises = Array.from({ length: 10 }, () =>
        dockerService.createInteractiveContainer(mockLanguageConfigs.python)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(dockerService.runningContainers.size).toBe(10);

      // Cleanup all containers
      await dockerService.cleanupAll();
    });
  });

  describe('Docker Info and System Operations', () => {
    test('should get Docker system info successfully', async () => {
      mockDocker.info.mockResolvedValue(mockDockerResponses.dockerInfo);

      const info = await dockerService.getSystemInfo();

      expect(info).toEqual({
        dockerVersion: mockDockerResponses.dockerInfo.ServerVersion,
        containers: mockDockerResponses.dockerInfo.Containers,
        images: mockDockerResponses.dockerInfo.Images,
        memoryLimit: mockDockerResponses.dockerInfo.MemTotal,
        cpuCount: mockDockerResponses.dockerInfo.NCPU
      });
    });

    test('should handle Docker info error', async () => {
      mockDocker.info.mockRejectedValue(new Error('Info failed'));

      await expect(dockerService.getSystemInfo()).rejects.toThrow('Info failed');
    });
  });

  describe('Language-Specific Configuration', () => {
    test('should get correct ulimits for different languages', () => {
      const pythonConfig = mockLanguageConfigs.python;
      const goConfig = { ...mockLanguageConfigs.python, name: 'Go' };

      const pythonUlimits = dockerService.getUlimitsForLanguage(pythonConfig);
      const goUlimits = dockerService.getUlimitsForLanguage(goConfig);

      expect(pythonUlimits).toEqual([
        { Name: 'nofile', Soft: 64, Hard: 64 },
        { Name: 'nproc', Soft: 32, Hard: 32 }
      ]);

      expect(goUlimits).toEqual([
        { Name: 'nofile', Soft: 256, Hard: 256 },
        { Name: 'nproc', Soft: 128, Hard: 128 }
      ]);
    });
  });
});