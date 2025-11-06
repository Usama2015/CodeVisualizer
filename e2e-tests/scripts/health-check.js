#!/usr/bin/env node

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

class HealthChecker {
  async checkService(url, name) {
    console.log(`🔍 Checking ${name} at ${url}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CodeVisualizer-HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404) {
        console.log(`✅ ${name} is healthy (${response.status})`);
        return {
          name,
          url,
          status: 'healthy',
          httpStatus: response.status,
          responseTime: Date.now()
        };
      } else {
        console.log(`⚠️  ${name} returned ${response.status}`);
        return {
          name,
          url,
          status: 'unhealthy',
          httpStatus: response.status,
          error: `HTTP ${response.status}`
        };
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ ${name} check timed out`);
        return {
          name,
          url,
          status: 'timeout',
          error: 'Request timed out'
        };
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${name} is not running`);
        return {
          name,
          url,
          status: 'down',
          error: 'Connection refused'
        };
      } else {
        console.log(`❌ ${name} check failed: ${error.message}`);
        return {
          name,
          url,
          status: 'error',
          error: error.message
        };
      }
    }
  }

  async checkBackendEndpoints() {
    console.log('🔍 Checking backend API endpoints...');

    const endpoints = [
      { path: '/health', name: 'Health Check' },
      { path: '/api/analyze/deep', name: 'Deep Analysis', method: 'POST' },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${BACKEND_URL}${endpoint.path}`;
        const options = {
          method: endpoint.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CodeVisualizer-HealthCheck/1.0'
          }
        };

        // For POST endpoints, add minimal test data
        if (endpoint.method === 'POST' && endpoint.path.includes('analyze')) {
          options.body = JSON.stringify({
            files: [{
              id: 'health-check',
              name: 'test.js',
              content: 'console.log("health check");',
              language: 'javascript'
            }]
          });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const status = response.ok || response.status === 404 ? 'healthy' : 'unhealthy';
        console.log(`${status === 'healthy' ? '✅' : '⚠️'} ${endpoint.name}: ${response.status}`);

        results.push({
          name: endpoint.name,
          path: endpoint.path,
          status,
          httpStatus: response.status
        });

      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
        results.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  async checkFrontendResources() {
    console.log('🔍 Checking frontend resources...');

    const resources = [
      { path: '/', name: 'Root Page' },
      { path: '/_next/static/css/', name: 'CSS Assets', expectStatus: [200, 404] },
    ];

    const results = [];

    for (const resource of resources) {
      try {
        const url = `${FRONTEND_URL}${resource.path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'CodeVisualizer-HealthCheck/1.0'
          }
        });

        clearTimeout(timeoutId);

        const expectedStatuses = resource.expectStatus || [200];
        const isHealthy = expectedStatuses.includes(response.status);

        console.log(`${isHealthy ? '✅' : '⚠️'} ${resource.name}: ${response.status}`);

        results.push({
          name: resource.name,
          path: resource.path,
          status: isHealthy ? 'healthy' : 'unhealthy',
          httpStatus: response.status
        });

      } catch (error) {
        console.log(`❌ ${resource.name}: ${error.message}`);
        results.push({
          name: resource.name,
          path: resource.path,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  async runFullHealthCheck() {
    console.log('🏥 Running comprehensive health check...');
    console.log('=====================================');

    const results = {
      timestamp: new Date().toISOString(),
      services: {},
      endpoints: {},
      resources: {},
      overall: 'unknown'
    };

    try {
      // Check main services
      console.log('\n📊 Main Services:');
      results.services.backend = await this.checkService(BACKEND_URL, 'Backend');
      results.services.frontend = await this.checkService(FRONTEND_URL, 'Frontend');

      // Check backend endpoints if backend is healthy
      console.log('\n🔌 Backend Endpoints:');
      if (results.services.backend.status === 'healthy') {
        const endpointResults = await this.checkBackendEndpoints();
        results.endpoints = endpointResults.reduce((acc, result) => {
          acc[result.name] = result;
          return acc;
        }, {});
      } else {
        console.log('⚠️  Skipping endpoint checks (backend unhealthy)');
      }

      // Check frontend resources if frontend is healthy
      console.log('\n🌐 Frontend Resources:');
      if (results.services.frontend.status === 'healthy') {
        const resourceResults = await this.checkFrontendResources();
        results.resources = resourceResults.reduce((acc, result) => {
          acc[result.name] = result;
          return acc;
        }, {});
      } else {
        console.log('⚠️  Skipping resource checks (frontend unhealthy)');
      }

      // Determine overall health
      const allChecks = [
        ...Object.values(results.services),
        ...Object.values(results.endpoints),
        ...Object.values(results.resources)
      ];

      const healthyCount = allChecks.filter(check => check.status === 'healthy').length;
      const totalCount = allChecks.length;

      if (healthyCount === totalCount) {
        results.overall = 'healthy';
      } else if (healthyCount > 0) {
        results.overall = 'degraded';
      } else {
        results.overall = 'unhealthy';
      }

      // Summary
      console.log('\n📋 Health Check Summary:');
      console.log('========================');
      console.log(`Overall Status: ${this.getStatusEmoji(results.overall)} ${results.overall.toUpperCase()}`);
      console.log(`Healthy Checks: ${healthyCount}/${totalCount}`);

      if (results.overall !== 'healthy') {
        console.log('\n❌ Issues Found:');
        allChecks.forEach(check => {
          if (check.status !== 'healthy') {
            console.log(`  - ${check.name}: ${check.status} (${check.error || check.httpStatus})`);
          }
        });
      }

      return results;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      results.overall = 'error';
      results.error = error.message;
      return results;
    }
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      case 'error': return '💥';
      default: return '❓';
    }
  }

  async waitForServices(maxWait = 60000) {
    console.log('⏳ Waiting for services to be ready...');

    const startTime = Date.now();
    const checkInterval = 3000; // 3 seconds

    while (Date.now() - startTime < maxWait) {
      const results = await this.runFullHealthCheck();

      if (results.overall === 'healthy') {
        console.log('✅ All services are ready!');
        return true;
      }

      console.log(`⏳ Services not ready yet, waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log('❌ Timeout waiting for services to be ready');
    return false;
  }
}

async function main() {
  const checker = new HealthChecker();

  try {
    const args = process.argv.slice(2);

    if (args.includes('--wait')) {
      const ready = await checker.waitForServices();
      process.exit(ready ? 0 : 1);
    } else {
      const results = await checker.runFullHealthCheck();

      // Output JSON if requested
      if (args.includes('--json')) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }

      // Exit with appropriate code
      const exitCode = results.overall === 'healthy' ? 0 : 1;
      process.exit(exitCode);
    }

  } catch (error) {
    console.error('❌ Health check script failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { HealthChecker };

// Run if called directly
if (require.main === module) {
  main();
}