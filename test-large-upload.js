#!/usr/bin/env node

/**
 * Test script to reproduce the large file upload connection issue
 */

const fetch = require('node-fetch');

// Create a realistic test payload similar to what would be sent from 104 files
function createTestPayload(numFiles = 104) {
  const files = [];

  for (let i = 0; i < numFiles; i++) {
    // Create realistic file content (average React component is ~200-500 lines)
    const lines = Math.floor(Math.random() * 300) + 200;
    const content = generateReactComponent(i, lines);

    files.push({
      id: `file-${Date.now()}-${i}`,
      name: `Component${i}.tsx`,
      path: `src/components/Component${i}.tsx`,
      content: content,
      language: 'tsx'
    });
  }

  return { files };
}

function generateReactComponent(index, numLines) {
  const baseComponent = `import React, { useState, useEffect } from 'react';
import { SomeType, AnotherType } from './types';

interface Component${index}Props {
  data: SomeType[];
  onUpdate: (data: AnotherType) => void;
  isLoading?: boolean;
}

export default function Component${index}({ data, onUpdate, isLoading = false }: Component${index}Props) {
  const [state, setState] = useState<SomeType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setState(data);
    }
  }, [data]);

  const handleClick = (item: SomeType) => {
    try {
      onUpdate(item);
    } catch (err) {
      setError('Failed to update');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="component-${index}">
      <h2>Component ${index}</h2>
      {state.map((item, idx) => (
        <div key={idx} onClick={() => handleClick(item)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}`;

  // Pad with comments to reach desired line count
  const currentLines = baseComponent.split('\n').length;
  const additionalLines = Math.max(0, numLines - currentLines);

  let padding = '';
  for (let i = 0; i < additionalLines; i++) {
    padding += `// Additional line ${i + 1} to increase file size\n`;
  }

  return baseComponent + '\n' + padding;
}

async function testUpload(numFiles, timeoutMs = 30000) {
  const payload = createTestPayload(numFiles);
  const payloadSize = JSON.stringify(payload).length;

  console.log(`🔍 Testing upload with ${numFiles} files`);
  console.log(`📦 Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏱️  Timeout: ${timeoutMs}ms`);
  console.log(`🚀 Starting request...`);

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Success! Analysis ID: ${result.id}`);
      console.log(`📈 Processing time: ${result.processingTime}ms`);
      console.log(`⚠️  Warnings: ${result.warnings?.length || 0}`);
      return { success: true, duration, result };
    } else {
      const errorText = await response.text();
      console.log(`❌ Request failed: ${errorText}`);
      return { success: false, duration, error: errorText };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`💥 Request failed after ${duration}ms`);
    console.log(`❌ Error: ${error.message}`);

    if (error.name === 'AbortError') {
      console.log(`⏰ Request timed out after ${timeoutMs}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`🔌 Connection refused - backend may not be running`);
    } else if (error.code === 'ECONNRESET') {
      console.log(`🔌 Connection reset - backend may have crashed or timed out`);
    }

    return { success: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 CodeVisualizer Large Upload Test\n');

  // Test with different file counts to find the breaking point
  const tests = [
    { files: 10, timeout: 10000 },   // Small test
    { files: 50, timeout: 30000 },   // Medium test
    { files: 104, timeout: 60000 },  // Large test (problem case)
    { files: 200, timeout: 120000 }  // Very large test
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    const result = await testUpload(test.files, test.timeout);

    if (!result.success) {
      console.log(`\n🔴 Test failed at ${test.files} files`);
      console.log(`💡 This is likely the breaking point!`);
      break;
    }

    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('🏁 Test completed');
}

// Check if backend is running first
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      const health = await response.json();
      console.log('🟢 Backend is running:', health);
      return true;
    } else {
      console.log('🔴 Backend health check failed');
      return false;
    }
  } catch (error) {
    console.log('🔴 Backend is not running:', error.message);
    return false;
  }
}

async function main() {
  const isBackendRunning = await checkBackend();
  if (!isBackendRunning) {
    console.log('\n❌ Please start the backend server first:');
    console.log('   cd /Users/usama/DevProjects/CodeVisualizer/backend');
    console.log('   npm run dev');
    process.exit(1);
  }

  await runTests();
}

if (require.main === module) {
  main().catch(console.error);
}