#!/usr/bin/env node

/**
 * Integration Verification Script
 * This script tests the complete flow to ensure everything works
 * Run this before marking any feature complete
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Simple fetch implementation for Node.js
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlParsed = new URL(url);
    const requestOptions = {
      hostname: urlParsed.hostname,
      port: urlParsed.port || 80,
      path: urlParsed.pathname + urlParsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    // Add Content-Length header if body is present
    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(data ? JSON.parse(data) : null),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function checkHealth(url, name) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      log(`✅ ${name} is running`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ ${name} is NOT running at ${url}`, 'red');
    return false;
  }
  return false;
}

async function testCompleteFlow() {
  log('\n🔍 CodeVisualizer Integration Verification', 'blue');
  log('=' .repeat(50));

  // Step 1: Check servers
  log('\n📡 Checking servers...', 'yellow');
  const backendHealth = await checkHealth(`${BACKEND_URL}/health`, 'Backend');
  const frontendHealth = await checkHealth(FRONTEND_URL, 'Frontend');

  if (!backendHealth || !frontendHealth) {
    log('\n⚠️  Please start both servers:', 'red');
    log('  Backend: cd backend && npm run dev', 'yellow');
    log('  Frontend: cd frontend && npm run dev', 'yellow');
    process.exit(1);
  }

  // Step 2: Test file analysis
  log('\n🔬 Testing file analysis...', 'yellow');

  const testFile = {
    id: 'test-' + Date.now(),
    name: 'test-component.tsx',
    content: `
      import React, { useState } from 'react';

      interface Props {
        title: string;
      }

      export function TestComponent({ title }: Props) {
        const [count, setCount] = useState(0);

        const handleClick = () => {
          setCount(count + 1);
        };

        return (
          <div>
            <h1>{title}</h1>
            <button onClick={handleClick}>Count: {count}</button>
          </div>
        );
      }
    `,
    language: 'typescript'
  };

  try {
    // Step 3: Send to analysis API
    const analyzeResponse = await fetch(`${BACKEND_URL}/api/analyze/deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [testFile] })
    });

    if (!analyzeResponse.ok) {
      throw new Error(`Analysis failed: ${analyzeResponse.statusText}`);
    }

    const analysisResult = await analyzeResponse.json();
    const analysisId = analysisResult.id;

    log(`✅ Analysis created with ID: ${analysisId}`, 'green');

    // Step 4: Verify analysis can be retrieved
    log('\n🔄 Verifying analysis retrieval...', 'yellow');

    const getResponse = await fetch(`${BACKEND_URL}/api/analysis/${analysisId}`);
    if (!getResponse.ok) {
      throw new Error(`Failed to retrieve analysis: ${getResponse.statusText}`);
    }

    const retrievedAnalysis = await getResponse.json();
    if (retrievedAnalysis.id !== analysisId) {
      throw new Error('Analysis ID mismatch');
    }

    log(`✅ Analysis retrieved successfully`, 'green');

    // Step 5: Check dependencies endpoint
    const depsResponse = await fetch(`${BACKEND_URL}/api/analysis/${analysisId}/dependencies`);
    if (!depsResponse.ok) {
      throw new Error(`Failed to get dependencies: ${depsResponse.statusText}`);
    }

    const dependencies = await depsResponse.json();
    if (!dependencies.nodes || !dependencies.edges) {
      throw new Error('Invalid dependencies format');
    }

    log(`✅ Dependencies endpoint working`, 'green');

    // Step 6: Check metrics endpoint
    const metricsResponse = await fetch(`${BACKEND_URL}/api/analysis/${analysisId}/metrics`);
    if (!metricsResponse.ok) {
      throw new Error(`Failed to get metrics: ${metricsResponse.statusText}`);
    }

    const metrics = await metricsResponse.json();
    if (!metrics.overall || !metrics.files) {
      throw new Error('Invalid metrics format');
    }

    log(`✅ Metrics endpoint working`, 'green');

    // Step 7: Verify data structure
    log('\n📊 Verifying data structure...', 'yellow');

    const analysis = retrievedAnalysis.analysis.analysis;
    if (!analysis.files || !Array.isArray(analysis.files)) {
      throw new Error('Invalid analysis structure');
    }

    const file = analysis.files[0];
    if (!file.imports || !file.exports || !file.functions) {
      throw new Error('Missing required file analysis properties');
    }

    log(`✅ Data structure is correct`, 'green');

    // Display results
    log('\n📈 Analysis Results:', 'blue');
    log(`  Files analyzed: ${analysis.files.length}`);
    log(`  Imports found: ${file.imports.length}`);
    log(`  Functions found: ${file.functions.length}`);
    log(`  Complexity: ${file.complexity}`);

    // Success!
    log('\n' + '='.repeat(50));
    log('🎉 All integration tests PASSED!', 'green');
    log('✨ CodeVisualizer is working correctly', 'green');

  } catch (error) {
    log(`\n❌ Integration test failed: ${error.message}`, 'red');
    log('\nDebug info:', 'yellow');
    log(`  Backend URL: ${BACKEND_URL}`);
    log(`  Frontend URL: ${FRONTEND_URL}`);
    process.exit(1);
  }
}

async function testFrontendBackendCommunication() {
  log('\n🔗 Testing Frontend-Backend Communication...', 'yellow');

  // This simulates what happens when user uploads files in the UI
  const testFiles = [
    {
      id: 'ui-test-1',
      name: 'app.tsx',
      content: 'import React from "react"; export default function App() { return <div>Test</div>; }',
      language: 'typescript'
    }
  ];

  try {
    // Step 1: Upload and analyze (simulating FileUpload component)
    const response = await fetch(`${BACKEND_URL}/api/analyze/deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: testFiles })
    });

    const result = await response.json();
    const analysisId = result.id;

    // Step 2: Frontend components fetch data (simulating AnalysisResults)
    const endpoints = [
      `/api/analysis/${analysisId}`,
      `/api/analysis/${analysisId}/dependencies`,
      `/api/analysis/${analysisId}/metrics`
    ];

    for (const endpoint of endpoints) {
      const url = `${BACKEND_URL}${endpoint}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Frontend would see 404 for ${endpoint}`);
      }

      log(`  ✅ ${endpoint} - OK`, 'green');
    }

    log('✅ Frontend-Backend communication working!', 'green');

  } catch (error) {
    log(`❌ Communication test failed: ${error.message}`, 'red');
    log('\nThis is the error users are seeing!', 'red');
    process.exit(1);
  }
}

// Run all tests
async function main() {
  await testCompleteFlow();
  await testFrontendBackendCommunication();

  log('\n🚀 Ready for deployment!', 'green');
  log('All integration points verified ✅', 'green');
}

main().catch(error => {
  log(`\n Fatal error: ${error.message}`, 'red');
  process.exit(1);
});