// Test utility functions and helpers

const EventEmitter = require('events');
const { performanceTestData } = require('../fixtures/mockData');

class TestHelpers {
  /**
   * Create a delay for async testing
   */
  static async delay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Wait for an event to be emitted
   */
  static async waitForEvent(emitter, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        emitter.off(event, onEvent);
        reject(new Error(`Event ${event} not emitted within ${timeout}ms`));
      }, timeout);

      const onEvent = (...args) => {
        clearTimeout(timer);
        resolve(args);
      };

      emitter.once(event, onEvent);
    });
  }

  /**
   * Create a mock EventEmitter with spy capabilities
   */
  static createMockEventEmitter() {
    const emitter = new EventEmitter();
    const spies = {
      on: jest.spyOn(emitter, 'on'),
      emit: jest.spyOn(emitter, 'emit'),
      once: jest.spyOn(emitter, 'once'),
      off: jest.spyOn(emitter, 'off')
    };

    return {
      emitter,
      spies,
      getEventCalls: (eventName) => {
        return spies.emit.mock.calls.filter(call => call[0] === eventName);
      },
      getLastEventCall: (eventName) => {
        const calls = spies.emit.mock.calls.filter(call => call[0] === eventName);
        return calls[calls.length - 1];
      },
      clearSpies: () => {
        Object.values(spies).forEach(spy => spy.mockClear());
      }
    };
  }

  /**
   * Generate test data with specific characteristics
   */
  static generateTestData(type, size = 1000) {
    switch (type) {
      case 'ansi':
        return '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m '.repeat(size / 20);
      case 'control':
        return '\x03\x04\x1b[A\x1b[B\x1b[C\x1b[D'.repeat(size / 10);
      case 'unicode':
        return '🚀 测试 '.repeat(size / 5);
      case 'binary':
        return Buffer.from(Array.from({ length: size }, (_, i) => i % 256));
      case 'mixed':
        return performanceTestData.ansiHeavyData + performanceTestData.controlCharHeavyData;
      default:
        return 'x'.repeat(size);
    }
  }

  /**
   * Create a mock stream with configurable behavior
   */
  static createMockStream(options = {}) {
    const emitter = new EventEmitter();
    const {
      writable = true,
      readable = true,
      destroyed = false,
      writeDelay = 0,
      dataDelay = 0,
      errorRate = 0
    } = options;

    let streamDestroyed = destroyed;
    const writtenData = [];

    return {
      writable,
      readable,
      destroyed: streamDestroyed,
      writtenData,

      write: jest.fn().mockImplementation((data, callback) => {
        if (streamDestroyed) {
          const error = new Error('Stream is destroyed');
          if (callback) callback(error);
          return false;
        }

        writtenData.push({ data, timestamp: new Date() });

        // Simulate write delay
        setTimeout(() => {
          // Simulate random errors
          if (Math.random() < errorRate) {
            const error = new Error('Random write error');
            if (callback) callback(error);
            emitter.emit('error', error);
            return;
          }

          if (callback) callback(null);
        }, writeDelay);

        return true;
      }),

      end: jest.fn().mockImplementation((callback) => {
        if (!streamDestroyed) {
          streamDestroyed = true;
          emitter.emit('end');
        }
        if (callback) callback();
      }),

      destroy: jest.fn().mockImplementation(() => {
        if (!streamDestroyed) {
          streamDestroyed = true;
          emitter.emit('close');
        }
      }),

      removeAllListeners: jest.fn(),
      setEncoding: jest.fn(),
      on: jest.fn().mockImplementation((event, listener) => {
        emitter.on(event, listener);

        // Simulate data arrival after delay
        if (event === 'data' && dataDelay > 0) {
          setTimeout(() => {
            emitter.emit('data', 'test data');
          }, dataDelay);
        }

        return emitter;
      }),
      once: jest.fn().mockImplementation((event, listener) => {
        emitter.once(event, listener);
        return emitter;
      }),
      off: jest.fn().mockImplementation((event, listener) => {
        emitter.off(event, listener);
        return emitter;
      }),

      // Helper methods for testing
      simulateData: (data) => {
        emitter.emit('data', data);
      },
      simulateError: (error) => {
        emitter.emit('error', error);
      },
      simulateClose: () => {
        emitter.emit('close');
      }
    };
  }

  /**
   * Measure performance of an async function
   */
  static async measurePerformance(fn, iterations = 1) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      results.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    return {
      totalTime: results.reduce((a, b) => a + b, 0),
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      iterations,
      results
    };
  }

  /**
   * Create a mock function with timing capabilities
   */
  static createTimedMock(fn = jest.fn(), delay = 0) {
    return jest.fn().mockImplementation(async (...args) => {
      if (delay > 0) {
        await this.delay(delay);
      }
      return fn(...args);
    });
  }

  /**
   * Validate data contains expected characteristics
   */
  static validateData(data, expectedCharacteristics) {
    const results = {
      hasANSI: /\x1b\[[0-9;]*[a-zA-Z]/.test(data),
      hasControlChars: /[\x00-\x1F\x7F]/.test(data),
      hasUnicode: /[^\x00-\x7F]/.test(data),
      isBinary: Buffer.isBuffer(data),
      size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8'),
      lines: typeof data === 'string' ? data.split('\n').length : 0
    };

    if (expectedCharacteristics) {
      const validation = {};
      for (const [key, expected] of Object.entries(expectedCharacteristics)) {
        validation[key] = results[key] === expected;
      }
      return { ...results, validation };
    }

    return results;
  }

  /**
   * Create a test scenario with multiple steps
   */
  static async runScenario(scenario) {
    const results = {
      steps: [],
      totalTime: 0,
      success: false,
      error: null
    };

    try {
      const startTime = Date.now();

      for (const step of scenario.steps) {
        const stepStart = Date.now();

        try {
          const result = await step.action();
          const stepTime = Date.now() - stepStart;

          results.steps.push({
            name: step.name,
            success: true,
            time: stepTime,
            result
          });
        } catch (error) {
          const stepTime = Date.now() - stepStart;

          results.steps.push({
            name: step.name,
            success: false,
            time: stepTime,
            error: error.message
          });

          if (step.continueOnError !== true) {
            throw error;
          }
        }
      }

      results.totalTime = Date.now() - startTime;
      results.success = true;

    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  /**
   * Create a memory usage monitor
   */
  static createMemoryMonitor() {
    const measurements = [];

    return {
      measure: () => {
        const usage = process.memoryUsage();
        measurements.push({
          timestamp: Date.now(),
          rss: usage.rss,
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external
        });
      },

      getMeasurements: () => measurements,

      getMemoryGrowth: () => {
        if (measurements.length < 2) return 0;
        const first = measurements[0];
        const last = measurements[measurements.length - 1];
        return last.heapUsed - first.heapUsed;
      },

      clear: () => {
        measurements.length = 0;
      }
    };
  }

  /**
   * Create a mock rate limiter
   */
  static createMockRateLimiter(options = {}) {
    const {
      windowMs = 60000,
      maxRequests = 100,
      shouldFail = false,
      failMessage = 'Rate limit exceeded'
    } = options;

    const requests = [];

    return {
      middleware: jest.fn().mockImplementation((req, res, next) => {
        const now = Date.now();

        // Clean old requests
        requests.splice(0, requests.findIndex(time => now - time < windowMs));

        if (shouldFail || requests.length >= maxRequests) {
          return res.status(429).json({
            error: failMessage,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        requests.push(now);
        next();
      }),

      getRequestCount: () => requests.length,

      reset: () => {
        requests.length = 0;
      }
    };
  }
}

module.exports = TestHelpers;