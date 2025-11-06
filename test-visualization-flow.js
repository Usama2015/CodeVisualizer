#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple test files to test the AST parser
const testFiles = [
  {
    name: 'test1.js',
    content: `
function hello() {
  console.log('Hello World');
}

module.exports = hello;
`
  },
  {
    name: 'test2.tsx',
    content: `
import React from 'react';

interface Props {
  name: string;
}

const Component: React.FC<Props> = ({ name }) => {
  return <div>Hello {name}</div>;
};

export default Component;
`
  }
];

async function testVisualizationFlow() {
  console.log('🚀 Testing CodeVisualizer Visualization Flow\n');

  try {
    // Step 1: Check health
    console.log('1️⃣ Checking backend health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend is healthy:', healthData);

    // Step 2: Upload files
    console.log('\n2️⃣ Uploading test files for analysis...');

    const filesData = testFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      path: file.name,
      content: file.content,
      language: file.name.endsWith('.tsx') ? 'tsx' : 'javascript'
    }));

    const uploadResponse = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: filesData })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Analysis failed: ${uploadResponse.status} - ${errorText}`);
    }

    const result = await uploadResponse.json();
    const analysisId = result.id;
    console.log('✅ Analysis completed. ID:', analysisId);

    // Step 3: Fetch analysis data
    console.log('\n3️⃣ Fetching analysis data...');
    const analysisResponse = await fetch(
      `http://localhost:3001/api/analysis/${analysisId}`
    );

    if (!analysisResponse.ok) {
      throw new Error(`Failed to fetch analysis: ${analysisResponse.status}`);
    }

    const analysis = await analysisResponse.json();

    // Step 4: Display analysis summary
    console.log('\n4️⃣ Analysis Summary:');
    console.log('═══════════════════════════════════════');
    console.log('📁 Files analyzed: ' + analysis.analysis.files.length);
    console.log('🔗 Dependencies found: ' + analysis.dependencies.edges.length);
    console.log('📊 Total nodes in graph: ' + analysis.dependencies.nodes.length);

    // Display file metrics
    console.log('\n📈 File Metrics:');
    analysis.analysis.files.forEach(file => {
      console.log('\n  ' + file.name + ':');
      console.log('    • Lines of code: ' + (file.metrics?.linesOfCode || 0));
      console.log('    • Complexity: ' + (file.metrics?.cyclomaticComplexity || 0));
      console.log('    • Functions: ' + (file.functions?.length || 0));
      console.log('    • Classes: ' + (file.classes?.length || 0));
      console.log('    • Imports: ' + (file.imports?.length || 0));
      console.log('    • Exports: ' + (file.exports?.length || 0));
    });

    console.log('\n✅ Visualization test completed successfully!');
    console.log('\n📊 View the visualizations at:');
    console.log('   http://localhost:3002/?analysisId=' + analysisId);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testVisualizationFlow();