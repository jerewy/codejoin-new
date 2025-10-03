jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue()
  }));
});

const DockerService = require('../src/services/dockerService');

describe('DockerService permission handling', () => {
  const languageConfig = {
    image: 'test-image',
    type: 'interpreted',
    runCommand: 'echo',
    name: 'Test'
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns permission guidance when Docker socket access is denied', async () => {
    const service = new DockerService();

    jest.spyOn(service, 'cleanup').mockResolvedValue();
    jest.spyOn(service, 'testConnection').mockRejectedValue(
      Object.assign(new Error('Access is denied.'), { code: 'EPERM' })
    );

    const result = await service.executeCode(languageConfig, 'console.log("test")');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied accessing Docker');
    expect(result.error).toContain('docker-users');
    expect(result.error).not.toContain('Docker is not running or not accessible');
  });
});
