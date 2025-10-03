jest.mock('dockerode');

const languageConfig = {
  image: 'codejoin/node:latest',
  name: 'JavaScript',
  runCommand: 'node /tmp/code.js',
  type: 'interpreted',
  fileExtension: '.js',
  timeout: 5000,
  memoryLimit: '256m',
  cpuLimit: 0.5
};

describe('DockerService connection errors', () => {
  let Docker;
  let pingMock;

  beforeEach(() => {
    jest.resetModules();
    Docker = require('dockerode');
    pingMock = jest.fn();

    Docker.mockImplementation(() => ({
      ping: pingMock,
      createContainer: jest.fn(),
      getContainer: jest.fn(),
      pull: jest.fn(),
      info: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns detailed connection failure message', async () => {
    const dockerError = Object.assign(new Error(''), {
      reason: 'connect ENOENT /var/run/docker.sock',
      code: 'ENOENT',
      errno: -2,
      syscall: 'connect'
    });
    pingMock.mockRejectedValue(dockerError);

    let response;
    jest.isolateModules(() => {
      const DockerService = require('../src/services/dockerService');
      const service = new DockerService();
      response = service.executeCode(languageConfig, 'console.log("test");');
    });

    const result = await response;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Docker is not running or not accessible');
    expect(result.error).toContain('Details: connect ENOENT /var/run/docker.sock');
    expect(result.error).toContain('code: ENOENT');
    expect(result.error).toContain('errno: -2');
    expect(result.error).toContain('syscall: connect');
  });
});
