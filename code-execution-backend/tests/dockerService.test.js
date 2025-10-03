jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue()
  }));
});

const DockerService = require('../src/services/dockerService');

const originalPlatform = process.platform;
const originalDockerHost = process.env.DOCKER_HOST;
const originalDockerSocket = process.env.DOCKER_SOCKET;

const setPlatform = (platform) => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true
  });
};

describe('DockerService buildDockerOptions', () => {
  afterEach(() => {
    if (originalDockerHost === undefined) {
      delete process.env.DOCKER_HOST;
    } else {
      process.env.DOCKER_HOST = originalDockerHost;
    }

    if (originalDockerSocket === undefined) {
      delete process.env.DOCKER_SOCKET;
    } else {
      process.env.DOCKER_SOCKET = originalDockerSocket;
    }

    setPlatform(originalPlatform);
    jest.clearAllMocks();
  });

  it('parses unix socket DOCKER_HOST on linux', () => {
    setPlatform('linux');
    process.env.DOCKER_HOST = 'unix:///tmp/docker.sock';

    const service = new DockerService();
    const { dockerOptions, fallbackDockerOptions } = service;

    expect(dockerOptions).toEqual({ socketPath: '/tmp/docker.sock' });
    expect(fallbackDockerOptions).toEqual({ socketPath: '/var/run/docker.sock' });
  });

  it('parses tcp DOCKER_HOST on darwin', () => {
    setPlatform('darwin');
    process.env.DOCKER_HOST = 'tcp://127.0.0.1:2375';

    const service = new DockerService();
    const { dockerOptions, fallbackDockerOptions } = service;

    expect(dockerOptions).toEqual({
      host: '127.0.0.1',
      port: 2375,
      protocol: 'http'
    });
    expect(fallbackDockerOptions).toEqual({ socketPath: '/var/run/docker.sock' });
  });

  it('parses npipe DOCKER_HOST on windows', () => {
    setPlatform('win32');
    process.env.DOCKER_SOCKET = '//./pipe/docker_engine';
    process.env.DOCKER_HOST = 'npipe:////./pipe/custom_engine';

    const service = new DockerService();
    const { dockerOptions, fallbackDockerOptions } = service;

    expect(dockerOptions).toEqual({ socketPath: '//./pipe/custom_engine' });
    expect(fallbackDockerOptions).toEqual({ socketPath: '//./pipe/docker_engine' });
  });
});
