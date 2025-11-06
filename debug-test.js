#!/usr/bin/env node

const fetch = require('node-fetch');

// Create a simple test with different payload sizes
async function testPayloadSize(numFiles) {
  const files = [];

  // Create simple test files
  for (let i = 0; i < numFiles; i++) {
    files.push({
      id: `file-${i}`,
      name: `test-${i}.js`,
      path: `src/test-${i}.js`,
      content: `// Test file ${i}\nconsole.log('Hello from file ${i}');\n`.repeat(100), // Repeat to make it larger
      language: 'javascript'
    });
  }

  const payload = { files };
  const payloadSize = JSON.stringify(payload).length;

  console.log(`\n🧪 Testing ${numFiles} files - Payload: ${(payloadSize / 1024).toFixed(1)}KB`);

  try {
    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`✅ Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`📊 Analysis ID: ${result.id}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Connection failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Debug Test - Finding payload size limit\n');

  // Test incrementally to find the breaking point
  const testSizes = [5, 10, 20, 30, 40, 50, 60];

  for (const size of testSizes) {
    const success = await testPayloadSize(size);
    if (!success) {
      console.log(`\n🔴 Failed at ${size} files - This is the breaking point!`);
      break;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch(console.error);