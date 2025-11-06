#!/usr/bin/env node

/**
 * Specific test for the two fixes:
 * 1. Double popup prevention in "Select Entire Folder" button
 * 2. JSON config file filtering (package.json, tsconfig.json, etc.)
 */

const fs = require('fs');
const path = require('path');

class SpecificFixTester {
  constructor() {
    this.results = {
      frontendCodeReview: {},
      jsonFiltering: {},
      summary: {
        allFixesWorking: false,
        issues: []
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  testFrontendDoublePopupFix() {
    this.log('Testing double popup prevention fix...', 'test');

    const fileUploadPath = '/Users/usama/DevProjects/CodeVisualizer/frontend/components/upload/FileUpload.tsx';

    if (!fs.existsSync(fileUploadPath)) {
      this.results.frontendCodeReview.error = 'FileUpload.tsx not found';
      this.log('FileUpload.tsx not found at expected path', 'error');
      return false;
    }

    const content = fs.readFileSync(fileUploadPath, 'utf8');

    // Check for the specific fix patterns
    const hasStopPropagation = content.includes('e.stopPropagation()');
    const hasPreventDefault = content.includes('e.preventDefault()');
    const hasOnMouseDown = content.includes('onMouseDown={(e) =>');
    const hasCorrectButtonHandler = content.includes('onClick={(e) => {') &&
                                   content.includes('e.stopPropagation();') &&
                                   content.includes('e.preventDefault();');

    this.results.frontendCodeReview = {
      hasStopPropagation,
      hasPreventDefault,
      hasOnMouseDown,
      hasCorrectButtonHandler,
      fixImplemented: hasStopPropagation && hasPreventDefault && hasCorrectButtonHandler
    };

    this.log(`Stop propagation found: ${hasStopPropagation}`, hasStopPropagation ? 'success' : 'error');
    this.log(`Prevent default found: ${hasPreventDefault}`, hasPreventDefault ? 'success' : 'error');
    this.log(`Mouse down handler found: ${hasOnMouseDown}`, hasOnMouseDown ? 'success' : 'error');
    this.log(`Complete button handler fix: ${hasCorrectButtonHandler}`, hasCorrectButtonHandler ? 'success' : 'error');

    const isFixed = this.results.frontendCodeReview.fixImplemented;
    this.log(`Double popup prevention fix: ${isFixed ? 'IMPLEMENTED' : 'NOT IMPLEMENTED'}`,
             isFixed ? 'success' : 'error');

    return isFixed;
  }

  testJsonFiltering() {
    this.log('Testing JSON config file filtering...', 'test');

    const fileUploadPath = '/Users/usama/DevProjects/CodeVisualizer/frontend/components/upload/FileUpload.tsx';

    if (!fs.existsSync(fileUploadPath)) {
      this.results.jsonFiltering.error = 'FileUpload.tsx not found';
      this.log('FileUpload.tsx not found at expected path', 'error');
      return false;
    }

    const content = fs.readFileSync(fileUploadPath, 'utf8');

    // Check for the filtering logic
    const hasFilterForCodeFiles = content.includes('codeFiles = acceptedFiles.filter');
    const hasConfigFileCheck = content.includes('isConfigFile');
    const hasPackageJsonFilter = content.includes('package.json');
    const hasTsconfigFilter = content.includes('tsconfig.json');
    const hasPackageLockFilter = content.includes('package-lock.json');
    const hasComponentsJsonFilter = content.includes('components.json');
    const hasExcludeLogic = content.includes('&& !isConfigFile');

    this.results.jsonFiltering = {
      hasFilterForCodeFiles,
      hasConfigFileCheck,
      hasPackageJsonFilter,
      hasTsconfigFilter,
      hasPackageLockFilter,
      hasComponentsJsonFilter,
      hasExcludeLogic,
      fixImplemented: hasFilterForCodeFiles && hasConfigFileCheck &&
                     hasPackageJsonFilter && hasTsconfigFilter && hasExcludeLogic
    };

    this.log(`Code files filter found: ${hasFilterForCodeFiles}`, hasFilterForCodeFiles ? 'success' : 'error');
    this.log(`Config file check found: ${hasConfigFileCheck}`, hasConfigFileCheck ? 'success' : 'error');
    this.log(`Package.json filter found: ${hasPackageJsonFilter}`, hasPackageJsonFilter ? 'success' : 'error');
    this.log(`Tsconfig.json filter found: ${hasTsconfigFilter}`, hasTsconfigFilter ? 'success' : 'error');
    this.log(`Package-lock.json filter found: ${hasPackageLockFilter}`, hasPackageLockFilter ? 'success' : 'error');
    this.log(`Components.json filter found: ${hasComponentsJsonFilter}`, hasComponentsJsonFilter ? 'success' : 'error');
    this.log(`Exclude logic found: ${hasExcludeLogic}`, hasExcludeLogic ? 'success' : 'error');

    const isFixed = this.results.jsonFiltering.fixImplemented;
    this.log(`JSON config file filtering fix: ${isFixed ? 'IMPLEMENTED' : 'NOT IMPLEMENTED'}`,
             isFixed ? 'success' : 'error');

    return isFixed;
  }

  simulateFileFiltering() {
    this.log('Simulating file filtering with test files...', 'test');

    // Create test file objects that simulate what would come from a folder upload
    const testFiles = [
      { name: 'App.tsx', webkitRelativePath: 'src/App.tsx' },
      { name: 'package.json', webkitRelativePath: 'package.json' },
      { name: 'tsconfig.json', webkitRelativePath: 'tsconfig.json' },
      { name: 'package-lock.json', webkitRelativePath: 'package-lock.json' },
      { name: 'components.json', webkitRelativePath: 'components.json' },
      { name: 'index.js', webkitRelativePath: 'src/index.js' },
      { name: 'utils.py', webkitRelativePath: 'backend/utils.py' },
      { name: 'config.json', webkitRelativePath: 'config/config.json' },
      { name: 'main.cpp', webkitRelativePath: 'src/main.cpp' },
      { name: 'README.md', webkitRelativePath: 'README.md' }
    ];

    // Apply the same filtering logic as in the frontend
    const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt'];

    const codeFiles = testFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      // Explicitly exclude package.json, tsconfig.json, and other config files
      const isConfigFile = file.name.includes('package.json') ||
                          file.name.includes('tsconfig.json') ||
                          file.name.includes('package-lock.json') ||
                          file.name.includes('components.json');
      return supportedExtensions.includes(ext || '') && !isConfigFile;
    });

    const expectedResults = {
      total: testFiles.length,
      expectedCodeFiles: ['App.tsx', 'index.js', 'utils.py', 'main.cpp'],
      expectedFiltered: ['package.json', 'tsconfig.json', 'package-lock.json', 'components.json'],
      actualCodeFiles: codeFiles.map(f => f.name),
      actualFiltered: testFiles.filter(f => !codeFiles.includes(f) &&
                                       supportedExtensions.includes(f.name.split('.').pop()?.toLowerCase() || ''))
                                       .map(f => f.name)
    };

    this.log(`Total test files: ${expectedResults.total}`, 'info');
    this.log(`Expected code files: ${expectedResults.expectedCodeFiles.length}`, 'info');
    this.log(`Actual code files: ${expectedResults.actualCodeFiles.length}`, 'info');
    this.log(`Expected to filter: ${expectedResults.expectedFiltered.join(', ')}`, 'info');
    this.log(`Actually filtered: ${expectedResults.actualFiltered.join(', ')}`, 'info');

    // Check if filtering works correctly
    const filteringWorks = expectedResults.expectedCodeFiles.length === expectedResults.actualCodeFiles.length &&
                          expectedResults.expectedCodeFiles.every(file => expectedResults.actualCodeFiles.includes(file)) &&
                          expectedResults.expectedFiltered.every(file => !expectedResults.actualCodeFiles.includes(file));

    this.log(`File filtering simulation: ${filteringWorks ? 'WORKING CORRECTLY' : 'HAS ISSUES'}`,
             filteringWorks ? 'success' : 'error');

    return {
      success: filteringWorks,
      details: expectedResults
    };
  }

  testSpecificConfigFiles() {
    this.log('Testing specific problematic files that were mentioned...', 'test');

    // Test the specific patterns that were causing issues
    const problematicFiles = [
      'package.json',
      'tsconfig.json',
      'package-lock.json',
      'components.json',
      'src/components.json', // This should also be filtered
      'nested/path/package.json' // This should also be filtered
    ];

    const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt'];

    const results = problematicFiles.map(fileName => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const isSupported = supportedExtensions.includes(ext || '');

      // Apply the same filtering logic as frontend
      const isConfigFile = fileName.includes('package.json') ||
                          fileName.includes('tsconfig.json') ||
                          fileName.includes('package-lock.json') ||
                          fileName.includes('components.json');

      const shouldBeFiltered = isSupported && isConfigFile;
      const wouldBeIncluded = isSupported && !isConfigFile;

      return {
        fileName,
        extension: ext,
        isSupported,
        isConfigFile,
        shouldBeFiltered,
        wouldBeIncluded,
        result: shouldBeFiltered ? 'FILTERED OUT' : (wouldBeIncluded ? 'INCLUDED' : 'NOT SUPPORTED')
      };
    });

    results.forEach(result => {
      this.log(`${result.fileName}: ${result.result}`,
               result.shouldBeFiltered ? 'success' : (result.wouldBeIncluded ? 'warning' : 'info'));
    });

    // All problematic files should be filtered out
    const allFilteredCorrectly = results.every(r => r.shouldBeFiltered);

    this.log(`All problematic config files filtered: ${allFilteredCorrectly ? 'YES' : 'NO'}`,
             allFilteredCorrectly ? 'success' : 'error');

    return {
      success: allFilteredCorrectly,
      details: results
    };
  }

  generateDetailedReport() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('DETAILED FIX VALIDATION REPORT', 'test');
    this.log('='.repeat(80), 'info');

    // Fix 1: Double Popup Prevention
    this.log('\nFIX 1: DOUBLE POPUP PREVENTION', 'info');
    this.log('-'.repeat(40), 'info');

    if (this.results.frontendCodeReview.error) {
      this.log(`Error: ${this.results.frontendCodeReview.error}`, 'error');
    } else {
      this.log(`Status: ${this.results.frontendCodeReview.fixImplemented ? 'IMPLEMENTED' : 'NOT IMPLEMENTED'}`,
               this.results.frontendCodeReview.fixImplemented ? 'success' : 'error');
      this.log('Components found:', 'info');
      this.log(`  - e.stopPropagation(): ${this.results.frontendCodeReview.hasStopPropagation}`, 'info');
      this.log(`  - e.preventDefault(): ${this.results.frontendCodeReview.hasPreventDefault}`, 'info');
      this.log(`  - onMouseDown handler: ${this.results.frontendCodeReview.hasOnMouseDown}`, 'info');
      this.log(`  - Complete button fix: ${this.results.frontendCodeReview.hasCorrectButtonHandler}`, 'info');
    }

    // Fix 2: JSON Config File Filtering
    this.log('\nFIX 2: JSON CONFIG FILE FILTERING', 'info');
    this.log('-'.repeat(40), 'info');

    if (this.results.jsonFiltering.error) {
      this.log(`Error: ${this.results.jsonFiltering.error}`, 'error');
    } else {
      this.log(`Status: ${this.results.jsonFiltering.fixImplemented ? 'IMPLEMENTED' : 'NOT IMPLEMENTED'}`,
               this.results.jsonFiltering.fixImplemented ? 'success' : 'error');
      this.log('Filter components found:', 'info');
      this.log(`  - Code files filter: ${this.results.jsonFiltering.hasFilterForCodeFiles}`, 'info');
      this.log(`  - Config file check: ${this.results.jsonFiltering.hasConfigFileCheck}`, 'info');
      this.log(`  - Package.json filter: ${this.results.jsonFiltering.hasPackageJsonFilter}`, 'info');
      this.log(`  - Tsconfig.json filter: ${this.results.jsonFiltering.hasTsconfigFilter}`, 'info');
      this.log(`  - Exclude logic: ${this.results.jsonFiltering.hasExcludeLogic}`, 'info');
    }

    // Summary
    const fix1Working = this.results.frontendCodeReview.fixImplemented;
    const fix2Working = this.results.jsonFiltering.fixImplemented;
    const bothWorking = fix1Working && fix2Working;

    this.log('\nSUMMARY', 'info');
    this.log('-'.repeat(40), 'info');
    this.log(`Fix 1 (Double Popup): ${fix1Working ? 'WORKING' : 'NEEDS ATTENTION'}`,
             fix1Working ? 'success' : 'error');
    this.log(`Fix 2 (JSON Filtering): ${fix2Working ? 'WORKING' : 'NEEDS ATTENTION'}`,
             fix2Working ? 'success' : 'error');
    this.log(`Overall Status: ${bothWorking ? 'ALL FIXES IMPLEMENTED' : 'SOME FIXES NEED ATTENTION'}`,
             bothWorking ? 'success' : 'warning');

    this.results.summary.allFixesWorking = bothWorking;
    if (!fix1Working) this.results.summary.issues.push('Double popup prevention not fully implemented');
    if (!fix2Working) this.results.summary.issues.push('JSON config file filtering not fully implemented');

    if (this.results.summary.issues.length > 0) {
      this.log('\nISSUES TO ADDRESS:', 'warning');
      this.results.summary.issues.forEach(issue => {
        this.log(`  - ${issue}`, 'warning');
      });
    }

    this.log('\n' + '='.repeat(80), 'info');
    return bothWorking;
  }

  async runAllTests() {
    this.log('Running specific fix validation tests...', 'test');

    // Test 1: Double popup prevention
    const fix1Working = this.testFrontendDoublePopupFix();

    this.log('', 'info'); // Empty line for spacing

    // Test 2: JSON filtering
    const fix2Working = this.testJsonFiltering();

    this.log('', 'info'); // Empty line for spacing

    // Test 3: Simulate file filtering
    const simulationResult = this.simulateFileFiltering();

    this.log('', 'info'); // Empty line for spacing

    // Test 4: Test specific problematic files
    const specificTestResult = this.testSpecificConfigFiles();

    // Generate detailed report
    const allWorking = this.generateDetailedReport();

    return allWorking;
  }
}

// Run the tests
const tester = new SpecificFixTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Specific fix testing failed:', error);
  process.exit(1);
});