# CodeVisualizer E2E Tests

Comprehensive end-to-end test suite for the CodeVisualizer application that verifies the complete user journey from file upload to visualization display.

## Overview

This test suite ensures that:
- ✅ Users can upload files through the UI
- ✅ Analysis completes successfully
- ✅ All tabs (Overview, Dependencies, Metrics) display data correctly
- ✅ The complete flow from upload to visualization works across browsers
- ✅ Frontend and backend integration works properly
- ✅ Error handling and edge cases are covered

## Test Structure

```
e2e-tests/
├── setup.e2e.ts                    # Test environment setup and utilities
├── vitest.config.e2e.ts           # Vitest configuration for E2E tests
├── upload-flow.e2e.test.tsx       # Complete file upload flow tests
├── analysis-display.e2e.test.tsx  # Analysis completion and data display tests
├── tabs-functionality.e2e.test.tsx # Tab navigation and functionality tests
├── cross-browser.e2e.test.tsx     # Cross-browser compatibility tests
├── scripts/
│   ├── start-servers.js           # Server startup management
│   ├── stop-servers.js            # Server shutdown management
│   ├── health-check.js            # Service health verification
│   └── run-e2e-tests.js          # Main test runner with CI/CD support
├── package.json                   # E2E test dependencies and scripts
└── README.md                      # This file
```

## Prerequisites

- Node.js 18+
- Both frontend and backend dependencies installed
- Ports 3000 and 3001 available

## Quick Start

### 1. Install Dependencies

```bash
cd e2e-tests
npm install
```

### 2. Run All Tests

```bash
# Run complete test suite
npm run test:full

# Or run tests with existing servers
npm test
```

### 3. Run Specific Test Suites

```bash
# Upload flow tests only
npm run test:upload-flow

# Analysis display tests only
npm run test:analysis-display

# Tab functionality tests only
npm run test:tabs

# Cross-browser compatibility tests only
npm run test:cross-browser
```

## Test Commands

### Basic Commands

```bash
# Run all E2E tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests in parallel (faster)
npm run test:parallel

# Run tests for CI/CD (with JUnit output)
npm run test:ci
```

### Server Management

```bash
# Start both frontend and backend servers
npm run start-servers

# Stop all servers
npm run stop-servers

# Check if services are healthy
npm run health-check

# Wait for services to be ready
npm run health-check -- --wait
```

### Advanced Test Runner

The `run-e2e-tests.js` script provides comprehensive testing capabilities:

```bash
# Run with custom options
node scripts/run-e2e-tests.js --parallel --coverage --reporter=junit

# Run specific test suite
node scripts/run-e2e-tests.js --suite=upload-flow

# Run with retries and timeout
node scripts/run-e2e-tests.js --retries=3 --timeout=180000

# Run with custom pattern
node scripts/run-e2e-tests.js --pattern="**/upload-*.test.tsx"

# Generate detailed reports
node scripts/run-e2e-tests.js --coverage --reporter=junit --output=./custom-results
```

## Test Categories

### 1. Upload Flow Tests (`upload-flow.e2e.test.tsx`)

Tests the complete file upload and analysis initiation process:

- **File Selection**: Drag & drop, file input, multiple files
- **Upload Modes**: File upload vs GitHub URL
- **Validation**: File type validation, size limits
- **Error Handling**: Network errors, server errors, invalid files
- **UI States**: Loading states, progress indicators
- **File Management**: Adding/removing files, file preview

**Key Scenarios:**
```typescript
// Upload multiple files and trigger analysis
it('should successfully upload files and trigger analysis')

// Handle different file types
it('should handle various supported file types')

// Error recovery
it('should handle upload errors gracefully')
```

### 2. Analysis Display Tests (`analysis-display.e2e.test.tsx`)

Tests data fetching, processing, and display after analysis completion:

- **Data Fetching**: API calls to analysis endpoints
- **Component Rendering**: AnalysisResults, DependencyGraph, CodeMetrics
- **Data Display**: File information, metrics, visualizations
- **Error States**: Partial failures, service unavailability
- **Real-time Updates**: Progress tracking, live updates

**Key Scenarios:**
```typescript
// Display comprehensive analysis results
it('should fetch and display analysis results correctly')

// Handle parsing errors
it('should handle analysis data with errors gracefully')

// Show real-time progress
it('should show progress during analysis')
```

### 3. Tab Functionality Tests (`tabs-functionality.e2e.test.tsx`)

Tests tab navigation, state management, and component integration:

- **Tab Navigation**: Switching between Overview, Dependencies, Metrics
- **State Persistence**: Data caching between tab switches
- **Component Integration**: Each tab component working correctly
- **Performance**: Efficient tab switching, no memory leaks
- **Error Isolation**: Tab-specific errors don't affect other tabs

**Key Scenarios:**
```typescript
// Navigate between all tabs
it('should switch between tabs correctly')

// Maintain data between switches
it('should cache data between tab switches')

// Handle individual component errors
it('should handle individual tab errors without affecting other tabs')
```

### 4. Cross-Browser Tests (`cross-browser.e2e.test.tsx`)

Tests compatibility across different browser environments:

- **Browser Detection**: User agent handling, feature detection
- **File APIs**: File handling across browsers
- **Drag & Drop**: Cross-browser drag and drop support
- **SVG/D3 Rendering**: Graphics compatibility
- **CSS Features**: Modern CSS feature support
- **Performance**: Cross-browser performance characteristics

**Key Scenarios:**
```typescript
// Test different browser environments
it('should detect and adapt to different browser environments')

// File handling compatibility
it('should handle File API consistently across browsers')

// SVG rendering support
it('should render SVG elements consistently across browsers')
```

## Configuration

### Vitest Configuration (`vitest.config.e2e.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setup.e2e.ts'],
    globals: true,
    testTimeout: 30000,      // 30s timeout for E2E tests
    hookTimeout: 10000,      // 10s for setup/teardown
    include: ['**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  }
});
```

### Environment Setup (`setup.e2e.ts`)

- **Server Management**: Automatic startup/shutdown of frontend and backend
- **Health Checks**: Verify services are ready before tests
- **Mocks**: SVG, ResizeObserver, and D3 compatibility mocks
- **Utilities**: Test file creation, async waiting helpers

### Test Configuration

```typescript
export const TEST_CONFIG = {
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:3001',
  STARTUP_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 1000,
};
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        cd frontend && npm ci
        cd ../backend && npm ci
        cd ../e2e-tests && npm ci

    - name: Run E2E tests
      run: cd e2e-tests && npm run test:ci

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: e2e-test-results
        path: e2e-tests/results/
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'cd frontend && npm ci'
                sh 'cd backend && npm ci'
                sh 'cd e2e-tests && npm ci'
            }
        }

        stage('E2E Tests') {
            steps {
                sh 'cd e2e-tests && node scripts/run-e2e-tests.js --parallel --coverage --reporter=junit'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'e2e-tests/results/test-results.xml'
                    archiveArtifacts artifacts: 'e2e-tests/results/**/*', allowEmptyArchive: true
                }
            }
        }
    }
}
```

## Debugging and Troubleshooting

### Common Issues

#### 1. Servers Not Starting
```bash
# Check for port conflicts
lsof -ti:3000
lsof -ti:3001

# Stop conflicting processes
npm run stop-servers

# Check health manually
npm run health-check
```

#### 2. Tests Timing Out
```bash
# Increase timeout
node scripts/run-e2e-tests.js --timeout=300000

# Run individual test suites
npm run test:upload-flow
```

#### 3. SVG/D3 Rendering Issues
The setup includes comprehensive mocks for SVG and D3 compatibility. If you encounter issues:

1. Check that `vitest.setup.ts` is properly configured
2. Verify SVG test IDs are present in components
3. Ensure D3 methods are properly mocked

#### 4. File Upload Issues
```bash
# Test file creation manually
node -e "console.log(require('./setup.e2e.ts').testUtils.createMockFile('test.js', 'content'))"

# Check browser File API support
# Ensure proper file type validation
```

### Debug Mode

Run tests with debug output:

```bash
# Enable debug logging
DEBUG=* npm test

# Run single test with detailed output
npm test -- --reporter=verbose upload-flow.e2e.test.tsx
```

### Manual Testing

Start servers manually for debugging:

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run specific tests
cd e2e-tests && npm test -- tabs-functionality.e2e.test.tsx
```

## Performance Considerations

### Test Optimization

- **Parallel Execution**: Use `--parallel` flag for faster execution
- **Selective Testing**: Run specific suites during development
- **Server Reuse**: Keep servers running between test runs in development
- **Mock Strategy**: Comprehensive mocking reduces external dependencies

### Resource Usage

- Tests automatically clean up between runs
- Servers are gracefully shut down after completion
- Memory usage is monitored for large file uploads
- Timeout management prevents hanging tests

## Contributing

### Adding New Tests

1. Create test files with `.e2e.test.tsx` extension
2. Follow existing patterns for setup and teardown
3. Use the provided utility functions in `setup.e2e.ts`
4. Include both positive and negative test cases
5. Test error conditions and edge cases

### Test Categories

When adding tests, consider these categories:

- **Happy Path**: Normal user workflows
- **Error Handling**: Network failures, invalid data, server errors
- **Edge Cases**: Large files, empty data, boundary conditions
- **Performance**: Response times, memory usage
- **Accessibility**: Screen reader support, keyboard navigation
- **Browser Compatibility**: Different environments and feature support

### Code Review Checklist

- [ ] Tests cover the main user journey
- [ ] Error cases are handled appropriately
- [ ] Tests are not flaky or dependent on timing
- [ ] Proper cleanup is implemented
- [ ] Test names are descriptive and clear
- [ ] Mock data is realistic and comprehensive
- [ ] Performance implications are considered

## Reporting and Analytics

### Test Reports

The E2E test suite generates several types of reports:

1. **JUnit XML**: For CI/CD integration (`test-results.xml`)
2. **JSON Report**: Detailed test metadata (`e2e-report.json`)
3. **Coverage Report**: Code coverage analysis (if enabled)
4. **Health Check Report**: Service status verification

### Metrics Tracked

- Test execution time
- Success/failure rates
- Service startup time
- Memory usage during tests
- Browser compatibility scores

---

## License

This E2E test suite is part of the CodeVisualizer project and follows the same license terms.