#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively get all files from a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);

    // Skip node_modules and other unnecessary directories
    if (file === 'node_modules' || file === '.git' || file === '.DS_Store' || file.startsWith('.')) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      const ext = path.extname(file).toLowerCase();
      const supportedExts = ['.js', '.jsx', '.ts', '.tsx'];
      if (supportedExts.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

async function testESLUpload() {
  console.log('🚀 Testing CodeVisualizer with ESL folder\n');

  const eslPath = '/Users/usama/DevProjects/ESL';

  try {
    // Get all JavaScript/TypeScript files from ESL
    const allFiles = getAllFiles(eslPath);

    console.log(`Found ${allFiles.length} code files in ESL directory`);

    // Group files by project
    const projectFiles = {
      'project-besl-backend': [],
      'project-besl-frontend': [],
      'project-besl-mqtt-service': []
    };

    allFiles.forEach(filePath => {
      if (filePath.includes('project-besl-backend')) {
        projectFiles['project-besl-backend'].push(filePath);
      } else if (filePath.includes('project-besl-frontend')) {
        projectFiles['project-besl-frontend'].push(filePath);
      } else if (filePath.includes('project-besl-mqtt-service')) {
        projectFiles['project-besl-mqtt-service'].push(filePath);
      }
    });

    console.log('\nFile distribution:');
    console.log(`- Backend: ${projectFiles['project-besl-backend'].length} files`);
    console.log(`- Frontend: ${projectFiles['project-besl-frontend'].length} files`);
    console.log(`- MQTT Service: ${projectFiles['project-besl-mqtt-service'].length} files`);

    // Prepare files for upload (limit to avoid overwhelming the system)
    const maxFiles = 50; // Limit for testing
    const filesToUpload = allFiles.slice(0, maxFiles);

    console.log(`\nPreparing to upload ${filesToUpload.length} files...`);

    const filesData = await Promise.all(
      filesToUpload.map(async (filePath, index) => {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const relativePath = path.relative(eslPath, filePath);

        return {
          id: `file-${Date.now()}-${index}`,
          name: path.basename(filePath),
          path: relativePath,  // Keep the full relative path including project directory
          content,
          language: getFileLanguage(filePath)
        };
      })
    );

    // Show sample of files being uploaded
    console.log('\nSample files being uploaded:');
    filesData.slice(0, 5).forEach(file => {
      console.log(`  - ${file.path}`);
    });

    // Upload to backend
    console.log('\n📤 Uploading to CodeVisualizer backend...');

    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: filesData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Analysis completed successfully!');
    console.log('Analysis ID:', result.id);

    // Fetch and display analysis details
    const analysisResponse = await fetch(
      `http://localhost:3001/api/analysis/${result.id}`
    );

    if (!analysisResponse.ok) {
      throw new Error(`Failed to fetch analysis: ${analysisResponse.status}`);
    }

    const analysis = await analysisResponse.json();

    console.log('\n📊 Analysis Results:');
    console.log('═══════════════════════════════════════');
    console.log('📁 Files analyzed:', analysis.analysis.files.length);
    console.log('🔗 Dependencies found:', analysis.dependencies.edges.length);
    console.log('📦 Nodes in graph:', analysis.dependencies.nodes.length);

    // Check how directories are being detected
    console.log('\n📂 Directory Structure Detected:');
    const directories = new Set();
    analysis.analysis.files.forEach(file => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
    });
    console.log('Directories found:', Array.from(directories));

    console.log('\n✅ Test completed successfully!');
    console.log('\n🌐 View the visualization at:');
    console.log(`   http://localhost:3000/?analysisId=${result.id}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

function getFileLanguage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const langMap = {
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx'
  };
  return langMap[ext] || 'javascript';
}

// Run the test
testESLUpload();