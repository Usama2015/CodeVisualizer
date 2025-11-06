#!/usr/bin/env node

const fetch = require('node-fetch');

// Create the same type of payload as the original failing test
function createRealistictestPayload(numFiles = 50) {
  const files = [];

  for (let i = 0; i < numFiles; i++) {
    // Create realistic React component content (similar to original test)
    const content = `import React, { useState, useEffect } from 'react';
import { SomeType, AnotherType } from './types';

interface Component${i}Props {
  data: SomeType[];
  onUpdate: (data: AnotherType) => void;
  isLoading?: boolean;
}

export default function Component${i}({ data, onUpdate, isLoading = false }: Component${i}Props) {
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
    <div className="component-${i}">
      <h2>Component ${i}</h2>
      {state.map((item, idx) => (
        <div key={idx} onClick={() => handleClick(item)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
`.repeat(5); // Make each file larger

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

async function testRealisticUpload() {
  const payload = createRealistictestPayload(50);
  const payloadSize = JSON.stringify(payload).length;

  console.log(`🧪 Testing realistic 50-file upload`);
  console.log(`📦 Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📄 Average file size: ${(payloadSize / 50 / 1024).toFixed(1)}KB`);

  try {
    console.log(`🚀 Starting request...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Aborting request after 30 seconds...`);
      controller.abort();
    }, 30000);

    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`📊 Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Success! Analysis ID: ${result.id}`);
      console.log(`⏱️  Processing time: ${result.processingTime}ms`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Connection failed: ${error.message}`);
    if (error.name === 'AbortError') {
      console.log(`⏰ Request was aborted due to timeout`);
    }
    return false;
  }
}

testRealisticUpload().catch(console.error);