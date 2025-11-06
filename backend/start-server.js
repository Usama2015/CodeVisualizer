#!/usr/bin/env node

/**
 * Enhanced server startup script with Node.js optimizations for large uploads
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting CodeVisualizer backend with optimizations for large uploads...');

// Node.js options for handling large HTTP requests
const nodeOptions = [
  '--max-http-header-size=32768',    // 32KB headers (default is 8KB)
  '--max-old-space-size=4096',       // 4GB heap (default is ~1.4GB)
  '--max-semi-space-size=256',       // 256MB semi-space
  '--expose-gc',                     // Enable garbage collection
];

// Path to ts-node and the application
const appPath = path.join(__dirname, 'src', 'app.ts');

console.log('📋 Node.js optimizations:');
nodeOptions.forEach(option => {
  console.log(`   ${option}`);
});

// Spawn the Node.js process with optimized settings
const child = spawn('node', [
  ...nodeOptions,
  '-r', 'ts-node/register',  // Register ts-node
  appPath
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    // Additional environment variables for large uploads
    UV_THREADPOOL_SIZE: '128',  // Increase thread pool size
  }
});

// Handle process exit
child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`\n🛑 Server stopped with signal: ${signal}`);
  } else {
    console.log(`\n🛑 Server exited with code: ${code}`);
  }
  process.exit(code || 0);
});

// Handle errors
child.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating server...');
  child.kill('SIGTERM');
});