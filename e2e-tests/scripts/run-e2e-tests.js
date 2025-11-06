#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ServerManager } = require('./start-servers');
const { HealthChecker } = require('./health-check');

const E2E_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

class E2ETestRunner {
  constructor(options = {}) {
    this.options = {
      parallel: options.parallel || false,
      coverage: options.coverage || false,
      watch: options.watch || false,
      ui: options.ui || false,
      reporter: options.reporter || 'default',
      timeout: options.timeout || 120000,
      retries: options.retries || 2,
      bail: options.bail || false,
      pattern: options.pattern || '**/*.e2e.test.{ts,tsx}',
      outputDir: options.outputDir || path.join(E2E_DIR, 'results'),
      ...options
    };

    this.serverManager = new ServerManager();
    this.healthChecker = new HealthChecker();
    this.isCleaningUp = false;
  }

  async ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.options.outputDir}`);
    }
  }

  async startServices() {
    console.log('🚀 Starting services for E2E tests...');

    try {
      const result = await this.serverManager.start();
      console.log('✅ Services started successfully');

      // Verify services are healthy
      console.log('🏥 Running health check...');
      const healthResults = await this.healthChecker.runFullHealthCheck();

      if (healthResults.overall !== 'healthy') {
        throw new Error(`Services are not healthy: ${healthResults.overall}`);
      }

      console.log('✅ All services are healthy and ready');
      return result;

    } catch (error) {
      console.error('❌ Failed to start services:', error);
      await this.cleanup();
      throw error;
    }
  }

  async runVitest() {
    console.log('🧪 Running E2E tests with Vitest...');

    return new Promise((resolve, reject) => {
      const vitestArgs = [
        'run',
        '--config', path.join(E2E_DIR, 'vitest.config.e2e.ts')
      ];

      // Add conditional arguments
      if (this.options.watch) vitestArgs.push('--watch');
      if (this.options.ui) vitestArgs.push('--ui');
      if (this.options.coverage) vitestArgs.push('--coverage');

      if (this.options.parallel) {
        vitestArgs.push('--pool=threads', '--poolOptions.threads.maxThreads=4');
      }

      if (this.options.reporter !== 'default') {
        vitestArgs.push('--reporter', this.options.reporter);

        if (this.options.reporter === 'junit') {
          const reportFile = path.join(this.options.outputDir, 'test-results.xml');
          vitestArgs.push('--outputFile', reportFile);
        }
      }

      if (this.options.bail) {
        vitestArgs.push('--bail');
      }

      // Add pattern if specified
      if (this.options.pattern !== '**/*.e2e.test.{ts,tsx}') {
        vitestArgs.push(this.options.pattern);
      }

      console.log('📝 Running command:', 'vitest', vitestArgs.join(' '));

      const vitestProcess = spawn('npx', ['vitest', ...vitestArgs], {
        cwd: E2E_DIR,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          VITEST_TIMEOUT: this.options.timeout.toString(),
          CI: process.env.CI || 'false'
        }
      });

      vitestProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ All tests passed!');
          resolve(code);
        } else {
          console.error(`❌ Tests failed with exit code ${code}`);
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      vitestProcess.on('error', (error) => {
        console.error('❌ Failed to start Vitest:', error);
        reject(error);
      });
    });
  }

  async runTestSuite(suiteName) {
    const suiteFiles = {
      'upload-flow': 'upload-flow.e2e.test.tsx',
      'analysis-display': 'analysis-display.e2e.test.tsx',
      'tabs': 'tabs-functionality.e2e.test.tsx',
      'cross-browser': 'cross-browser.e2e.test.tsx'
    };

    const fileName = suiteFiles[suiteName];
    if (!fileName) {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }

    console.log(`🎯 Running test suite: ${suiteName}`);

    const originalPattern = this.options.pattern;
    this.options.pattern = fileName;

    try {
      await this.runVitest();
      console.log(`✅ Test suite '${suiteName}' completed successfully`);
    } finally {
      this.options.pattern = originalPattern;
    }
  }

  async runWithRetries(fn, maxRetries = this.options.retries) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}${maxRetries > 0 ? ` of ${maxRetries + 1}` : ''}...`);
        return await fn();
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt <= maxRetries) {
          console.log(`⏳ Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Restart services before retry
          console.log('🔄 Restarting services for retry...');
          await this.cleanup();
          await this.startServices();
        }
      }
    }

    throw lastError;
  }

  async generateReport() {
    console.log('📊 Generating test report...');

    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: !!process.env.CI
      },
      configuration: this.options
    };

    const reportFile = path.join(this.options.outputDir, 'e2e-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

    console.log(`📄 Report saved to: ${reportFile}`);
  }

  async cleanup() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    console.log('🧹 Cleaning up...');

    try {
      await this.serverManager.stop();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️  Cleanup error:', error);
    }
  }

  setupSignalHandlers() {
    process.on('SIGINT', async () => {
      console.log('\n⚠️  Received SIGINT, cleaning up...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⚠️  Received SIGTERM, cleaning up...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught exception:', error);
      await this.cleanup();
      process.exit(1);
    });
  }

  async run() {
    this.startTime = Date.now();
    this.setupSignalHandlers();

    try {
      console.log('🎯 Starting E2E Test Runner');
      console.log('============================');

      await this.ensureOutputDir();

      // Start services
      await this.startServices();

      // Run tests with retries
      await this.runWithRetries(() => this.runVitest());

      // Generate report
      await this.generateReport();

      console.log('🎉 E2E tests completed successfully!');
      return 0;

    } catch (error) {
      console.error('❌ E2E tests failed:', error);
      return 1;

    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const options = {
    parallel: args.includes('--parallel'),
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    ui: args.includes('--ui'),
    bail: args.includes('--bail'),
    retries: parseInt(args.find(arg => arg.startsWith('--retries='))?.split('=')[1]) || 2,
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 120000,
    reporter: args.find(arg => arg.startsWith('--reporter='))?.split('=')[1] || 'default',
    pattern: args.find(arg => arg.startsWith('--pattern='))?.split('=')[1] || '**/*.e2e.test.{ts,tsx}',
    outputDir: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || path.join(__dirname, '../results')
  };

  const runner = new E2ETestRunner(options);

  // Handle specific test suite
  const suiteArg = args.find(arg => arg.startsWith('--suite='));
  if (suiteArg) {
    const suiteName = suiteArg.split('=')[1];
    try {
      await runner.startServices();
      await runner.runTestSuite(suiteName);
      await runner.cleanup();
      process.exit(0);
    } catch (error) {
      await runner.cleanup();
      process.exit(1);
    }
  }

  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
CodeVisualizer E2E Test Runner

Usage: node run-e2e-tests.js [options]

Options:
  --parallel         Run tests in parallel
  --coverage         Generate coverage report
  --watch           Watch mode
  --ui              Open Vitest UI
  --bail            Stop on first failure
  --retries=N       Number of retries (default: 2)
  --timeout=N       Test timeout in ms (default: 120000)
  --reporter=TYPE   Reporter type (default, junit, json)
  --pattern=GLOB    Test file pattern
  --output=DIR      Output directory for reports
  --suite=NAME      Run specific test suite (upload-flow, analysis-display, tabs, cross-browser)
  --help, -h        Show this help

Examples:
  node run-e2e-tests.js                    # Run all tests
  node run-e2e-tests.js --parallel         # Run tests in parallel
  node run-e2e-tests.js --suite=upload-flow # Run only upload flow tests
  node run-e2e-tests.js --coverage --reporter=junit # Generate coverage and JUnit reports
    `);
    process.exit(0);
  }

  // Run tests
  const exitCode = await runner.run();
  process.exit(exitCode);
}

// Export for use in other scripts
module.exports = { E2ETestRunner };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}