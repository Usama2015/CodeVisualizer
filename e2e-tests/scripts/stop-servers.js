#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;

class ServerStopper {
  async findProcessesByPort(port) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    } catch (error) {
      // No processes found on this port
      return [];
    }
  }

  async killProcess(pid, signal = 'TERM') {
    try {
      await execAsync(`kill -${signal} ${pid}`);
      console.log(`✅ Killed process ${pid} with signal ${signal}`);
      return true;
    } catch (error) {
      console.log(`⚠️  Process ${pid} may have already exited`);
      return false;
    }
  }

  async killProcessesByPort(port) {
    console.log(`🔍 Looking for processes on port ${port}...`);

    const pids = await this.findProcessesByPort(port);

    if (pids.length === 0) {
      console.log(`✅ No processes found on port ${port}`);
      return;
    }

    console.log(`🎯 Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);

    // First try graceful shutdown
    for (const pid of pids) {
      await this.killProcess(pid, 'TERM');
    }

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if any processes are still running and force kill
    const remainingPids = await this.findProcessesByPort(port);

    if (remainingPids.length > 0) {
      console.log(`⚠️  ${remainingPids.length} process(es) still running, force killing...`);

      for (const pid of remainingPids) {
        await this.killProcess(pid, 'KILL');
      }
    }

    console.log(`✅ All processes on port ${port} have been stopped`);
  }

  async stopAllServers() {
    console.log('🧹 Stopping all CodeVisualizer servers...');

    try {
      // Stop backend
      await this.killProcessesByPort(BACKEND_PORT);

      // Stop frontend
      await this.killProcessesByPort(FRONTEND_PORT);

      console.log('✅ All servers stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping servers:', error);
      throw error;
    }
  }

  async waitForPortsToBeFree() {
    console.log('⏳ Waiting for ports to be free...');

    const maxWait = 10000; // 10 seconds
    const checkInterval = 1000; // 1 second
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const backendProcesses = await this.findProcessesByPort(BACKEND_PORT);
      const frontendProcesses = await this.findProcessesByPort(FRONTEND_PORT);

      if (backendProcesses.length === 0 && frontendProcesses.length === 0) {
        console.log('✅ All ports are now free');
        return;
      }

      console.log(`⏳ Still waiting... (Backend: ${backendProcesses.length}, Frontend: ${frontendProcesses.length})`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log('⚠️  Timeout waiting for ports to be free');
  }
}

async function main() {
  const stopper = new ServerStopper();

  try {
    await stopper.stopAllServers();
    await stopper.waitForPortsToBeFree();

    console.log('🎉 Server shutdown complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to stop servers:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { ServerStopper };

// Run if called directly
if (require.main === module) {
  main();
}