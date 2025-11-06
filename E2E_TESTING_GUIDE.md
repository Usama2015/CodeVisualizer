# CodeVisualizer E2E Testing Guide

## Quick Start

```bash
# Run all E2E tests
./run-e2e-tests.sh

# Run specific test suite
./run-e2e-tests.sh --suite=upload-flow

# Run tests in parallel with coverage
./run-e2e-tests.sh --parallel --coverage

# Development mode with watch
./run-e2e-tests.sh --watch
```
###

## What These Tests Cover

### 🔄 Complete User Journey
- **File Upload**: Drag & drop, file selection, multiple files
- **Analysis Process**: Real-time progress, error handling
- **Results Display**: All tabs working correctly with real data
- **User Interactions**: Tab switching, data exploration, error recovery

### 🎯 Integration Points
- **Frontend ↔ Backend**: API calls, data format validation
- **Component Integration**: All React components working together
- **State Management**: Data persistence across user actions
- **Real-time Updates**: Progress tracking, live data updates

### 🌐 Browser Compatibility
- **File APIs**: File handling across different browsers
- **Drag & Drop**: Cross-browser drag and drop support
- **SVG/D3 Rendering**: Visualization compatibility
- **Performance**: Response times and resource usage

### ⚡ Error Scenarios
- **Network Failures**: Connection issues, timeouts
- **Invalid Data**: Malformed files, parsing errors
- **Server Errors**: Backend failures, partial responses
- **Edge Cases**: Large files, empty data, boundary conditions

## Test Structure

```
📁 e2e-tests/
├── 🔧 setup.e2e.ts                    # Test environment & utilities
├── ⚙️  vitest.config.e2e.ts           # Vitest configuration
├── 📤 upload-flow.e2e.test.tsx        # File upload & analysis flow
├── 📊 analysis-display.e2e.test.tsx   # Data display & components
├── 🔀 tabs-functionality.e2e.test.tsx # Tab navigation & state
├── 🌐 cross-browser.e2e.test.tsx      # Browser compatibility
├── 📦 package.json                    # Dependencies & scripts
└── 📋 README.md                       # Detailed documentation
```

## Test Categories

### 1. Upload Flow Tests 📤
**Purpose**: Verify complete file upload and analysis initiation

**Key Scenarios**:
- ✅ File selection via drag & drop
- ✅ File selection via file input
- ✅ Multiple file handling
- ✅ File type validation
- ✅ GitHub URL analysis
- ✅ Upload progress and states
- ✅ Error handling and recovery
- ✅ File management (add/remove)

**Example**:
```typescript
it('should successfully upload files and trigger analysis', async () => {
  // Upload files
  const testFile = testUtils.createMockFile('test.js', 'console.log("test");');
  await user.upload(fileInput, [testFile]);

  // Trigger analysis
  await user.click(screen.getByText('Upload and Analyze'));

  // Verify analysis starts
  await waitFor(() => {
    expect(screen.getByText('Analysis Results')).toBeInTheDocument();
  });
});
```

### 2. Analysis Display Tests 📊
**Purpose**: Verify data fetching, processing, and display

**Key Scenarios**:
- ✅ Analysis results rendering
- ✅ File information display
- ✅ Metrics calculation and display
- ✅ Error handling (parsing failures)
- ✅ Loading states and progress
- ✅ Real-time updates
- ✅ Component error isolation

**Example**:
```typescript
it('should display comprehensive file analysis', async () => {
  render(<AnalysisResults analysisId="test-123" />);

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('components/Header.tsx')).toBeInTheDocument();
    expect(screen.getByText(/Lines of Code: 124/)).toBeInTheDocument();
    expect(screen.getByText(/Complexity: 6/)).toBeInTheDocument();
  });
});
```

### 3. Tab Functionality Tests 🔀
**Purpose**: Verify tab navigation and component integration

**Key Scenarios**:
- ✅ Tab switching and state management
- ✅ Data persistence between tabs
- ✅ Individual component functionality
- ✅ Performance during rapid switching
- ✅ Error isolation between tabs
- ✅ Component-specific data loading

**Example**:
```typescript
it('should switch between tabs correctly', async () => {
  // Start on Overview tab
  expect(screen.getByText('Overview')).toHaveClass('active');

  // Switch to Dependencies
  await user.click(screen.getByText('Dependencies'));
  expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();

  // Switch to Metrics
  await user.click(screen.getByText('Metrics'));
  expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
});
```

### 4. Cross-Browser Tests 🌐
**Purpose**: Verify compatibility across browser environments

**Key Scenarios**:
- ✅ Browser detection and adaptation
- ✅ File API compatibility
- ✅ Drag & drop functionality
- ✅ SVG and D3 rendering
- ✅ CSS feature support
- ✅ Performance characteristics
- ✅ Error handling differences

**Example**:
```typescript
it('should handle File API consistently across browsers', async () => {
  const testFile = testUtils.createMockFile('test.js', 'content');

  // File properties should be consistent
  expect(testFile.name).toBe('test.js');
  expect(testFile.size).toBeGreaterThan(0);

  // File should be processable
  await user.upload(fileInput, [testFile]);
  expect(screen.getByText('test.js')).toBeInTheDocument();
});
```

## Running Specific Tests

### Individual Test Suites
```bash
# Upload flow only
./run-e2e-tests.sh --suite=upload-flow

# Analysis display only
./run-e2e-tests.sh --suite=analysis-display

# Tab functionality only
./run-e2e-tests.sh --suite=tabs

# Cross-browser only
./run-e2e-tests.sh --suite=cross-browser
```

### Development Workflow
```bash
# Start servers and keep them running
./run-e2e-tests.sh --setup-only

# In another terminal, run tests in watch mode
cd e2e-tests && npm run test:watch

# When done, cleanup
./run-e2e-tests.sh --cleanup-only
```

### CI/CD Mode
```bash
# Run all tests with coverage and JUnit output
./run-e2e-tests.sh --ci --coverage --parallel

# Check if services are healthy
./run-e2e-tests.sh --health-check
```

## Test Utilities

### Mock File Creation
```typescript
// Create a mock file for testing
const testFile = testUtils.createMockFile(
  'MyComponent.tsx',
  `import React from 'react';
   export const MyComponent = () => <div>Hello</div>;`,
  'text/typescript'
);
```

### Async Utilities
```typescript
// Wait for element to appear
await testUtils.waitForElement('[data-testid="analysis-results"]');

// Wait for service to be ready
await testUtils.waitForResponse('http://localhost:3001/health');
```

### Service Management
```typescript
// Health check
const healthChecker = new HealthChecker();
const results = await healthChecker.runFullHealthCheck();

// Server management
const serverManager = new ServerManager();
await serverManager.start();
await serverManager.stop();
```

## Key Benefits

### 🔍 **Comprehensive Coverage**
- Tests the complete user journey from upload to visualization
- Covers all major components and their integration
- Includes error scenarios and edge cases
- Validates browser compatibility

### ⚡ **Fast Feedback**
- Automated test environment setup
- Parallel test execution
- Targeted test suites for quick iteration
- Real-time health monitoring

### 🔧 **Developer Friendly**
- Easy-to-use command line interface
- Watch mode for development
- Visual test interface with Vitest UI
- Comprehensive error reporting

### 📊 **CI/CD Ready**
- JUnit XML output for CI systems
- Coverage reporting
- Artifact generation
- Exit codes for pipeline integration

## Troubleshooting

### Common Issues

#### Tests Failing to Start
```bash
# Check port availability
lsof -ti:3000 -ti:3001

# Stop any conflicting processes
./run-e2e-tests.sh --cleanup-only

# Verify dependencies
cd frontend && npm install
cd ../backend && npm install
cd ../e2e-tests && npm install
```

#### Timeouts or Slow Tests
```bash
# Run with increased timeout
cd e2e-tests
node scripts/run-e2e-tests.js --timeout=300000

# Run individual suites
./run-e2e-tests.sh --suite=upload-flow
```

#### SVG/D3 Rendering Issues
The tests include comprehensive mocks for browser compatibility. If you see SVG-related errors:

1. Check that test components have proper `data-testid` attributes
2. Verify the setup file includes all necessary mocks
3. Ensure D3 components handle missing DOM methods gracefully

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* ./run-e2e-tests.sh

# Use Vitest UI for interactive debugging
./run-e2e-tests.sh --ui

# Run single test with detailed output
cd e2e-tests && npm test -- --reporter=verbose upload-flow.e2e.test.tsx
```

## Integration with Existing Tests

These E2E tests complement the existing unit tests and integration tests:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and API contracts
- **E2E Tests**: Test complete user workflows and system integration

Together, they provide comprehensive coverage of the CodeVisualizer application.

## Performance Benchmarks

The E2E tests track several performance metrics:

- **Startup Time**: How long services take to start
- **Upload Performance**: File processing speed
- **Rendering Performance**: Component load times
- **Memory Usage**: Resource consumption during tests
- **Cross-browser Performance**: Consistency across environments

These metrics help ensure the application performs well in real-world scenarios.

---

For detailed documentation, see `/e2e-tests/README.md`