jest.mock('dockerode', () => jest.fn().mockImplementation(() => ({})));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const DockerService = require('../src/services/dockerService');
const logger = require('../src/utils/logger');

const createMockStream = (overrides = {}) => ({
  write: jest.fn((value, callback) => {
    if (typeof callback === 'function') {
      callback();
    }
  }),
  end: jest.fn(),
  ...overrides
});

const createMockContainer = (streamOverrides) => {
  const stream = createMockStream(streamOverrides);

  return {
    stream,
    attach: jest.fn().mockResolvedValue(stream),
    start: jest.fn().mockResolvedValue(),
    wait: jest.fn().mockResolvedValue({ StatusCode: 0 }),
    logs: jest.fn().mockResolvedValue(Buffer.alloc(0)),
    kill: jest.fn()
  };
};

describe('DockerService runContainer stdin handling', () => {
  const languageConfig = { timeout: 25 };
  let service;
  let parseSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new DockerService();
    parseSpy = jest
      .spyOn(service, 'parseDockerStream')
      .mockReturnValue({ stdout: 'program output', stderr: '' });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    parseSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('attaches to container stdin and writes normalized payload', async () => {
    const container = createMockContainer();

    const result = await service.runContainer(
      container,
      languageConfig,
      'input without newline'
    );

    expect(container.attach).toHaveBeenCalledWith({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      tty: false
    });
    expect(container.stream.write).toHaveBeenCalledWith(
      'input without newline\n',
      expect.any(Function)
    );
    expect(container.stream.end).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({ output: 'program output', error: '', exitCode: 0 })
    );
  });

  it('closes stdin without writing when input is empty', async () => {
    const container = createMockContainer({
      write: jest.fn(),
      end: jest.fn()
    });

    await service.runContainer(container, languageConfig, '');

    expect(container.stream.write).not.toHaveBeenCalled();
    expect(container.stream.end).toHaveBeenCalledTimes(1);
  });

  it('closes stdin even when write emits an error', async () => {
    const writeError = new Error('boom');
    const container = createMockContainer({
      write: jest.fn((_value, callback) => {
        if (typeof callback === 'function') {
          callback(writeError);
        }
      }),
      end: jest.fn()
    });

    await service.runContainer(container, languageConfig, 'data');

    expect(container.stream.end).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write to container stdin')
    );
  });

  it('closes stdin in finally when writeInputToStream rejects', async () => {
    const container = createMockContainer({
      write: jest.fn(),
      end: jest.fn()
    });
    const failure = new Error('write helper failure');
    const writeSpy = jest
      .spyOn(service, 'writeInputToStream')
      .mockRejectedValue(failure);

    const result = await service.runContainer(
      container,
      languageConfig,
      'some data'
    );

    expect(container.stream.end).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        exitCode: 1,
        error: expect.stringContaining(failure.message)
      })
    );

    writeSpy.mockRestore();
  });
});
