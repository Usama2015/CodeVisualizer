import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

// Mock fetch globally for E2E tests
global.fetch = fetch as any;

// Global test state
let frontendProcess: ChildProcess;
let backendProcess: ChildProcess;

export const TEST_CONFIG = {
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:3001',
  STARTUP_TIMEOUT: 30000, // 30 seconds
  HEALTH_CHECK_INTERVAL: 1000, // 1 second
};

// Mock ResizeObserver for Recharts and D3 components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock SVG elements and methods for D3 compatibility
if (typeof SVGElement !== 'undefined') {
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    value: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    writable: true,
  });
}

// Mock window and SVG methods
if (typeof window !== 'undefined') {
  const mockGetComputedTextLength = () => 100;
  const mockCreateSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: 0, y: 0 })
  });
  const mockGetScreenCTM = () => ({
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
  });

  if (window.SVGTextElement) {
    Object.defineProperty(window.SVGTextElement.prototype, 'getComputedTextLength', {
      value: mockGetComputedTextLength,
      writable: true,
    });
  }

  if (window.SVGSVGElement) {
    Object.defineProperty(window.SVGSVGElement.prototype, 'createSVGPoint', {
      value: mockCreateSVGPoint,
      writable: true,
    });

    Object.defineProperty(window.SVGSVGElement.prototype, 'getScreenCTM', {
      value: mockGetScreenCTM,
      writable: true,
    });
  }
}

// Utility function to check if a service is ready
async function waitForService(url: string, timeout: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) { // 404 is ok for frontend root
        console.log(`✅ Service ready at ${url}`);
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.HEALTH_CHECK_INTERVAL));
  }

  console.error(`❌ Service at ${url} not ready after ${timeout}ms`);
  return false;
}

// Start backend server
async function startBackend(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server...');

    const backend = spawn('npm', ['run', 'dev'], {
      cwd: '/Users/usama/DevProjects/CodeVisualizer/backend',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', PORT: '3001' }
    });

    let output = '';

    backend.stdout?.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running on port 3001') || output.includes('listening on port 3001')) {
        console.log('✅ Backend server started');
        resolve(backend);
      }
    });

    backend.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('Backend stderr:', errorOutput);
      // Don't reject on stderr as some logs might go there
    });

    backend.on('error', (error) => {
      console.error('Backend process error:', error);
      reject(error);
    });

    backend.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`Backend process exited with code ${code}`);
        reject(new Error(`Backend process exited with code ${code}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      console.log('⏰ Backend startup timeout, proceeding anyway...');
      resolve(backend);
    }, 15000);
  });
}

// Start frontend server
async function startFrontend(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting frontend server...');

    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: '/Users/usama/DevProjects/CodeVisualizer/frontend',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', PORT: '3000' }
    });

    let output = '';

    frontend.stdout?.on('data', (data) => {
      output += data.toString();
      if (output.includes('Ready') || output.includes('Local:') || output.includes('localhost:3000')) {
        console.log('✅ Frontend server started');
        resolve(frontend);
      }
    });

    frontend.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('Frontend stderr:', errorOutput);
      // Don't reject on stderr as some logs might go there
    });

    frontend.on('error', (error) => {
      console.error('Frontend process error:', error);
      reject(error);
    });

    frontend.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`Frontend process exited with code ${code}`);
        reject(new Error(`Frontend process exited with code ${code}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      console.log('⏰ Frontend startup timeout, proceeding anyway...');
      resolve(frontend);
    }, 15000);
  });
}

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');

  try {
    // Start backend first
    backendProcess = await startBackend();
    await waitForService(`${TEST_CONFIG.BACKEND_URL}/health`, TEST_CONFIG.STARTUP_TIMEOUT);

    // Then start frontend
    frontendProcess = await startFrontend();
    await waitForService(TEST_CONFIG.FRONTEND_URL, TEST_CONFIG.STARTUP_TIMEOUT);

    console.log('✅ E2E test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup E2E environment:', error);
    throw error;
  }
}, TEST_CONFIG.STARTUP_TIMEOUT);

// Global cleanup - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
    console.log('✅ Frontend server stopped');
  }

  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    console.log('✅ Backend server stopped');
  }

  // Wait a bit for processes to shut down gracefully
  await new Promise(resolve => setTimeout(resolve, 2000));
});

// Clean up between individual tests
beforeEach(() => {
  // Reset any global state if needed
  console.log('🔄 Preparing for next test...');
});

afterEach(() => {
  // Clean up any test-specific state
  console.log('🧹 Cleaning up after test...');
});

// Utility functions for tests
export const testUtils = {
  async waitForElement(selector: string, timeout = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  },

  async waitForResponse(url: string, timeout = 10000): Promise<boolean> {
    return waitForService(url, timeout);
  },

  createTestFile(name: string, content: string, language = 'javascript') {
    return {
      id: `test-${Date.now()}-${Math.random()}`,
      name,
      content,
      language
    };
  },

  // Mock File object for dropzone testing
  createMockFile(name: string, content: string, type = 'text/plain'): File {
    const blob = new Blob([content], { type });
    const file = blob as any;
    file.name = name;
    file.size = content.length;
    file.type = type;
    file.lastModified = Date.now();
    return file as File;
  }
};