#!/usr/bin/env node

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BACKEND_PATH = path.join(PROJECT_ROOT, 'backend');
const FRONTEND_PATH = path.join(PROJECT_ROOT, 'frontend');

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const STARTUP_TIMEOUT = 60000; // 60 seconds
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds

class ServerManager {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.isShuttingDown = false;
  }

  async waitForService(url, timeout = STARTUP_TIMEOUT) {
    const startTime = Date.now();
    console.log(`⏳ Waiting for service at ${url}...`);

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          console.log(`✅ Service ready at ${url}`);
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
    }

    console.error(`❌ Service at ${url} not ready after ${timeout}ms`);
    return false;
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting backend server...');

      this.backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: BACKEND_PATH,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PORT: BACKEND_PORT.toString()
        }
      });

      let output = '';

      this.backendProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        if (chunk.includes('Server running') ||
            chunk.includes('listening') ||
            chunk.includes(`port ${BACKEND_PORT}`)) {
          console.log('✅ Backend server started');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('Backend stderr:', errorOutput);
      });

      this.backendProcess.on('error', (error) => {
        console.error('Backend process error:', error);
        reject(error);
      });

      this.backendProcess.on('exit', (code, signal) => {
        if (!this.isShuttingDown && code !== 0) {
          console.error(`Backend process exited with code ${code}, signal ${signal}`);
          reject(new Error(`Backend process exited with code ${code}`));
        }
      });

      // Timeout fallback
      setTimeout(() => {
        console.log('⏰ Backend startup timeout, proceeding...');
        resolve();
      }, 30000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting frontend server...');

      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: FRONTEND_PATH,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PORT: FRONTEND_PORT.toString(),
          NEXT_TELEMETRY_DISABLED: '1'
        }
      });

      let output = '';

      this.frontendProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        if (chunk.includes('Ready') ||
            chunk.includes('Local:') ||
            chunk.includes(`localhost:${FRONTEND_PORT}`) ||
            chunk.includes('compiled successfully')) {
          console.log('✅ Frontend server started');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('Frontend stderr:', errorOutput);
      });

      this.frontendProcess.on('error', (error) => {
        console.error('Frontend process error:', error);
        reject(error);
      });

      this.frontendProcess.on('exit', (code, signal) => {
        if (!this.isShuttingDown && code !== 0) {
          console.error(`Frontend process exited with code ${code}, signal ${signal}`);
          reject(new Error(`Frontend process exited with code ${code}`));
        }
      });

      // Timeout fallback
      setTimeout(() => {
        console.log('⏰ Frontend startup timeout, proceeding...');
        resolve();
      }, 45000);
    });
  }

  async start() {
    try {
      console.log('🔧 Setting up E2E test environment...');

      // Start backend first
      await this.startBackend();

      // Wait for backend to be ready
      const backendReady = await this.waitForService(`http://localhost:${BACKEND_PORT}/health`);
      if (!backendReady) {
        throw new Error('Backend failed to start');
      }

      // Start frontend
      await this.startFrontend();

      // Wait for frontend to be ready
      const frontendReady = await this.waitForService(`http://localhost:${FRONTEND_PORT}`);
      if (!frontendReady) {
        throw new Error('Frontend failed to start');
      }

      console.log('✅ All services are ready!');
      console.log(`🌐 Frontend: http://localhost:${FRONTEND_PORT}`);
      console.log(`🔧 Backend: http://localhost:${BACKEND_PORT}`);

      return {
        frontendUrl: `http://localhost:${FRONTEND_PORT}`,
        backendUrl: `http://localhost:${BACKEND_PORT}`,
        processes: {
          backend: this.backendProcess,
          frontend: this.frontendProcess
        }
      };

    } catch (error) {
      console.error('❌ Failed to start servers:', error);
      await this.stop();
      throw error;
    }
  }

  async stop() {
    console.log('🧹 Shutting down servers...');
    this.isShuttingDown = true;

    const promises = [];

    if (this.frontendProcess && !this.frontendProcess.killed) {
      promises.push(new Promise((resolve) => {
        this.frontendProcess.on('exit', () => {
          console.log('✅ Frontend server stopped');
          resolve();
        });
        this.frontendProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!this.frontendProcess.killed) {
            this.frontendProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      }));
    }

    if (this.backendProcess && !this.backendProcess.killed) {
      promises.push(new Promise((resolve) => {
        this.backendProcess.on('exit', () => {
          console.log('✅ Backend server stopped');
          resolve();
        });
        this.backendProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!this.backendProcess.killed) {
            this.backendProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      }));
    }

    await Promise.all(promises);
    console.log('✅ All servers stopped');
  }

  setupSignalHandlers() {
    process.on('SIGINT', async () => {
      console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught exception:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}

// Main execution
async function main() {
  const serverManager = new ServerManager();
  serverManager.setupSignalHandlers();

  try {
    const result = await serverManager.start();

    // If started from command line, keep running
    if (require.main === module) {
      console.log('🎯 Servers are running. Press Ctrl+C to stop.');

      // Keep the process alive
      process.stdin.resume();
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to start servers:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { ServerManager };

// Run if called directly
if (require.main === module) {
  main();
}