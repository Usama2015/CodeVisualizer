// Test script to analyze CodeVisualizer's own code
const fs = require('fs');
const path = require('path');

async function testSelfAnalysis() {
  console.log('📊 Testing CodeVisualizer by analyzing its own code...');
  
  // Collect frontend component files
  const frontendFiles = [
    {
      id: 'analysis-results',
      name: 'AnalysisResults.tsx',
      path: './frontend/components/analysis/AnalysisResults.tsx',
      language: 'typescript'
    },
    {
      id: 'dependency-graph',
      name: 'DependencyGraph.tsx',
      path: './frontend/components/analysis/DependencyGraph.tsx',
      language: 'typescript'
    },
    {
      id: 'code-metrics',
      name: 'CodeMetrics.tsx',
      path: './frontend/components/analysis/CodeMetrics.tsx',
      language: 'typescript'
    },
    {
      id: 'file-upload',
      name: 'FileUpload.tsx',
      path: './frontend/components/upload/FileUpload.tsx',
      language: 'typescript'
    }
  ];

  // Collect backend service files
  const backendFiles = [
    {
      id: 'ast-parser',
      name: 'astParser.ts',
      path: './backend/src/services/astParser.ts',
      language: 'typescript'
    },
    {
      id: 'dependency-analyzer',
      name: 'dependencyAnalyzer.ts',
      path: './backend/src/services/dependencyAnalyzer.ts',
      language: 'typescript'
    },
    {
      id: 'metrics-calculator',
      name: 'metricsCalculator.ts',
      path: './backend/src/services/metricsCalculator.ts',
      language: 'typescript'
    },
    {
      id: 'architecture-detector',
      name: 'architectureDetector.ts',
      path: './backend/src/services/architectureDetector.ts',
      language: 'typescript'
    }
  ];

  const allFiles = [...frontendFiles, ...backendFiles];
  
  // Read file contents
  const filesWithContent = allFiles.map(file => {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      return {
        ...file,
        content
      };
    } catch (err) {
      console.warn(`⚠️  Could not read ${file.path}:`, err.message);
      return null;
    }
  }).filter(Boolean);

  console.log(`\n📁 Analyzing ${filesWithContent.length} files...`);
  filesWithContent.forEach(f => console.log(`  - ${f.name}`));

  try {
    // Send to backend API
    const response = await fetch('http://localhost:3001/api/analyze/deep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: filesWithContent
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Analysis Complete!');
    console.log('\n📊 Analysis Results:');
    console.log('='.repeat(50));
    
    // Display analysis summary
    if (result.analysis?.analysis?.files) {
      const files = result.analysis.analysis.files;
      console.log(`\n📁 Files Analyzed: ${files.length}`);
      
      let totalLines = 0;
      let totalComplexity = 0;
      let totalFunctions = 0;
      let totalClasses = 0;
      let totalImports = 0;
      let totalExports = 0;
      
      files.forEach(file => {
        console.log(`\n📄 ${file.path}`);
        console.log(`  Language: ${file.language}`);
        console.log(`  Imports: ${file.imports.length}`);
        console.log(`  Exports: ${file.exports.length}`);
        console.log(`  Functions: ${file.functions.length}`);
        console.log(`  Classes: ${file.classes.length}`);
        console.log(`  Complexity: ${file.complexity}`);
        
        if (file.metrics) {
          console.log(`  Lines of Code: ${file.metrics.linesOfCode}`);
          console.log(`  Cyclomatic Complexity: ${file.metrics.cyclomaticComplexity}`);
          console.log(`  Maintainability Index: ${file.metrics.maintainabilityIndex?.toFixed(2) || 'N/A'}`);
          totalLines += file.metrics.linesOfCode || 0;
        }
        
        totalComplexity += file.complexity || 0;
        totalFunctions += file.functions.length;
        totalClasses += file.classes.length;
        totalImports += file.imports.length;
        totalExports += file.exports.length;
        
        if (file.duplication) {
          console.log(`  Duplication: ${file.duplication.percentage}%`);
        }
      });
      
      console.log('\n📈 Overall Statistics:');
      console.log('='.repeat(50));
      console.log(`  Total Lines of Code: ${totalLines}`);
      console.log(`  Average Complexity: ${(totalComplexity / files.length).toFixed(2)}`);
      console.log(`  Total Functions: ${totalFunctions}`);
      console.log(`  Total Classes: ${totalClasses}`);
      console.log(`  Total Imports: ${totalImports}`);
      console.log(`  Total Exports: ${totalExports}`);
    }
    
    // Display dependencies
    if (result.dependencies) {
      console.log('\n🔗 Dependencies:');
      console.log('='.repeat(50));
      console.log(`  Nodes: ${result.dependencies.nodes.length}`);
      console.log(`  Edges: ${result.dependencies.edges.length}`);
      
      if (result.dependencies.edges.length > 0) {
        console.log('\n  Dependency Graph:');
        result.dependencies.edges.forEach(edge => {
          console.log(`    ${edge.source} → ${edge.target}`);
          if (edge.imports?.length > 0) {
            console.log(`      Imports: ${edge.imports.join(', ')}`);
          }
        });
      }
      
      if (result.dependencies.cycles?.length > 0) {
        console.log('\n⚠️  Circular Dependencies Detected:');
        result.dependencies.cycles.forEach(cycle => {
          console.log(`    ${cycle.join(' → ')} → ${cycle[0]}`);
        });
      }
    }
    
    // Display architecture patterns
    if (result.analysis?.analysis?.architecturePatterns?.length > 0) {
      console.log('\n🏗️  Architecture Patterns Detected:');
      console.log('='.repeat(50));
      result.analysis.analysis.architecturePatterns.forEach(pattern => {
        console.log(`  ${pattern.type}: ${(pattern.confidence * 100).toFixed(1)}% confidence`);
        if (pattern.components) {
          console.log(`    Components: ${pattern.components.join(', ')}`);
        }
      });
    }
    
    console.log('\n✨ Self-analysis test completed successfully!');
    console.log('\n💡 Try opening http://localhost:3000 to visualize this data!');
    
    return result;
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    console.error('\nMake sure both frontend and backend servers are running:');
    console.error('  Backend: cd backend && npm run dev (port 3001)');
    console.error('  Frontend: cd frontend && npm run dev (port 3000)');
    process.exit(1);
  }
}

// Run the test
testSelfAnalysis().catch(console.error);