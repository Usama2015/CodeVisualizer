// Test sending file with explicit path
const fetch = require('node-fetch');

async function testPath() {
  const files = [
    {
      id: 'file-test-1',
      name: 'test.js',
      path: 'project-besl-backend/src/test.js',
      content: 'console.log("test");',
      language: 'javascript'
    },
    {
      id: 'file-test-2',
      name: 'app.js',
      path: 'project-besl-frontend/src/app.js',
      content: 'const app = {}; export default app;',
      language: 'javascript'
    },
    {
      id: 'file-test-3',
      name: 'mqtt.js',
      path: 'project-besl-mqtt-service/src/mqtt.js',
      content: 'const mqtt = require("mqtt");',
      language: 'javascript'
    }
  ];

  try {
    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });

    const result = await response.json();
    console.log('Analysis ID:', result.id);

    // Fetch the analysis
    const analysisResponse = await fetch(`http://localhost:3001/api/analysis/${result.id}`);
    const analysis = await analysisResponse.json();

    console.log('\nFile paths in analysis:');
    analysis.analysis.files.forEach(file => {
      console.log(`  - ${file.path} (name: ${file.name})`);
    });

    const dirs = new Set();
    analysis.analysis.files.forEach(file => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        dirs.add(parts[0]);
      }
    });
    console.log('\nProjects detected:', Array.from(dirs));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPath();