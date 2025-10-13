#!/usr/bin/env node

/**
 * Test runner script with enhanced reporting and CI integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_TYPES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  PERFORMANCE: 'performance',
  ALL: 'all'
};

const REPORT_FORMATS = {
  TEXT: 'text',
  JSON: 'json',
  JUNIT: 'junit',
  HTML: 'html'
};

class TestRunner {
  constructor(options = {}) {
    this.options = {
      type: options.type || TEST_TYPES.ALL,
      format: options.format || REPORT_FORMATS.TEXT,
      coverage: options.coverage !== false,
      watch: options.watch || false,
      verbose: options.verbose || false,
      bail: options.bail || false,
      maxWorkers: options.maxWorkers || '50%',
      timeout: options.timeout || 30000,
      ...options
    };

    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      coverage: null,
      duration: 0
    };
  }

  async run() {
    console.log('🚀 Starting Terminal Execution Backend Test Suite');
    console.log(`📋 Test type: ${this.options.type}`);
    console.log(`📊 Report format: ${this.options.format}`);
    console.log(`🔍 Coverage: ${this.options.coverage ? 'enabled' : 'disabled'}`);
    console.log('');

    const startTime = Date.now();

    try {
      await this.prepareEnvironment();
      await this.runTests();
      await this.generateReports();

      this.testResults.duration = Date.now() - startTime;

      this.printSummary();

      if (this.testResults.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  async prepareEnvironment() {
    console.log('🔧 Preparing test environment...');

    // Ensure test directories exist
    const testDirs = ['test/unit', 'test/integration', 'test/performance', 'coverage'];
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.DOCKER_HOST = ''; // Use mock Docker for tests
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

    // Clean up previous test artifacts
    if (fs.existsSync('coverage')) {
      fs.rmSync('coverage', { recursive: true, force: true });
    }

    console.log('✅ Test environment prepared');
    console.log('');
  }

  getJestConfig() {
    const baseConfig = {
      testTimeout: this.options.timeout,
      maxWorkers: this.options.maxWorkers,
      verbose: this.options.verbose,
      bail: this.options.bail ? 1 : 0,
      detectOpenHandles: true,
      forceExit: !this.options.watch
    };

    if (this.options.coverage) {
      baseConfig.collectCoverage = true;
      baseConfig.collectCoverageFrom = [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/config/**',
        '!src/utils/logger.js'
      ];
      baseConfig.coverageDirectory = 'coverage';
      baseConfig.coverageReporters = ['text', 'lcov', 'html'];
      baseConfig.coverageThreshold = {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80
        }
      };
    }

    return baseConfig;
  }

  getTestPattern() {
    switch (this.options.type) {
      case TEST_TYPES.UNIT:
        return 'test/unit/**/*.test.js';
      case TEST_TYPES.INTEGRATION:
        return 'test/integration/**/*.test.js';
      case TEST_TYPES.PERFORMANCE:
        return 'test/performance/**/*.test.js';
      case TEST_TYPES.ALL:
      default:
        return 'test/**/*.test.js';
    }
  }

  async runTests() {
    console.log('🧪 Running tests...');

    const jestArgs = [
      '--config', 'jest.config.js',
      '--testPathPattern=' + this.getTestPattern(),
      '--passWithNoTests'
    ];

    if (this.options.coverage) {
      jestArgs.push('--coverage');
    }

    if (this.options.watch) {
      jestArgs.push('--watch');
    }

    if (this.options.verbose) {
      jestArgs.push('--verbose');
    }

    try {
      const jestConfig = this.getJestConfig();
      const configPath = path.join(process.cwd(), 'jest-temp-config.json');
      fs.writeFileSync(configPath, JSON.stringify(jestConfig, null, 2));

      jestArgs.push('--config', configPath);

      console.log(`📝 Jest command: npx jest ${jestArgs.join(' ')}`);

      const output = execSync(`npx jest ${jestArgs.join(' ')}`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      // Parse results from Jest output
      this.parseTestResults(output);

      // Clean up temporary config
      fs.unlinkSync(configPath);

    } catch (error) {
      // Jest will exit with non-zero code on test failures
      this.parseTestResults(error.stdout || '');

      if (!error.stdout || !error.stdout.includes('Test Suites:')) {
        throw new Error(`Jest execution failed: ${error.message}`);
      }
    }

    console.log('');
  }

  parseTestResults(output) {
    if (!output) return;

    const testMatch = /Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/i;
    const suiteMatch = /Test Suites:\s+(\d+)\s+passed,\s+(\d+)\s+failed/i;

    const testResult = output.match(testMatch);
    const suiteResult = output.match(suiteMatch);

    if (testResult) {
      this.testResults.passed = parseInt(testResult[1]);
      this.testResults.failed = parseInt(testResult[2]);
      this.testResults.total = this.testResults.passed + this.testResults.failed;
    }

    if (suiteResult) {
      this.testResults.suitesPassed = parseInt(suiteResult[1]);
      this.testResults.suitesFailed = parseInt(suiteResult[2]);
      this.testResults.suitesTotal = this.testResults.suitesPassed + this.testResults.suitesFailed;
    }
  }

  async generateReports() {
    if (!this.options.coverage) return;

    console.log('📊 Generating test reports...');

    try {
      // Generate coverage summary
      if (fs.existsSync('coverage/coverage-summary.json')) {
        const coverageSummary = JSON.parse(
          fs.readFileSync('coverage/coverage-summary.json', 'utf8')
        );
        this.testResults.coverage = coverageSummary.total;

        console.log(`📈 Coverage Summary:`);
        console.log(`   Lines: ${coverageSummary.total.lines.pct}%`);
        console.log(`   Functions: ${coverageSummary.total.functions.pct}%`);
        console.log(`   Branches: ${coverageSummary.total.branches.pct}%`);
        console.log(`   Statements: ${coverageTotal.total.statements.pct}%`);
        console.log('');
      }

      // Generate JUnit XML for CI systems
      if (this.options.format === REPORT_FORMATS.JUNIT) {
        execSync('npx jest --ci --reporters=default --reporters=jest-junit', {
          stdio: 'inherit'
        });
      }

      console.log('✅ Reports generated');
      console.log('');
    } catch (error) {
      console.warn('⚠️  Report generation failed:', error.message);
    }
  }

  printSummary() {
    console.log('📋 Test Execution Summary');
    console.log('========================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);

    if (this.testResults.suitesTotal) {
      console.log(`📦 Test Suites: ${this.testResults.suitesPassed}/${this.testResults.suitesTotal}`);
    }

    console.log(`⏱️  Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);

    if (this.testResults.failed === 0) {
      console.log('');
      console.log('🎉 All tests passed!');
    } else {
      console.log('');
      console.log(`💥 ${this.testResults.failed} test(s) failed`);
    }

    console.log('');
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--type':
        options.type = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--max-workers':
        options.maxWorkers = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Terminal Execution Backend Test Runner

Usage: node run-tests.js [options]

Options:
  --type <type>        Test type: unit, integration, performance, all (default: all)
  --format <format>    Report format: text, json, junit, html (default: text)
  --no-coverage       Disable coverage collection
  --watch             Run tests in watch mode
  --verbose           Enable verbose output
  --bail              Stop on first test failure
  --max-workers <n>   Maximum number of workers (default: 50%)
  --timeout <ms>      Test timeout in milliseconds (default: 30000)
  --help              Show this help message

Examples:
  node run-tests.js                           # Run all tests
  node run-tests.js --type unit               # Run only unit tests
  node run-tests.js --format junit --coverage # Run tests with JUnit and coverage
  node run-tests.js --watch                   # Run tests in watch mode
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;