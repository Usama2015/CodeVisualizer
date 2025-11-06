# CodeVisualizer Test Suite

This document provides comprehensive information about the test suite created to prevent runtime errors and ensure the stability of the CodeVisualizer application.

## Overview

The test suite addresses specific issues that were encountered and prevents them from occurring in the future:

- **404 API errors** - Tests ensure proper API endpoint configuration and error handling
- **Double-nested data structures** - Validates consistent data structure across frontend and backend
- **TSX parsing errors** - Comprehensive tests for TypeScript and JSX file parsing
- **Double popup issues** - Event handling tests prevent multiple form submissions
- **JSON file upload failures** - Proper filtering of config files during upload

## Test Structure

```
CodeVisualizer/
├── frontend/
│   ├── __tests__/
│   │   ├── api/
│   │   │   └── api-endpoints.test.ts          # API configuration tests
│   │   ├── components/
│   │   │   ├── FileUpload.test.tsx            # Basic upload tests
│   │   │   └── FileUpload.enhanced.test.tsx   # Comprehensive upload tests
│   │   └── integration/
│   │       ├── frontend-backend.test.tsx      # Integration tests
│   │       ├── analysis-display.test.tsx      # Display functionality
│   │       └── page.test.tsx                  # Page-level tests
│   ├── vitest.config.ts                       # Vitest configuration
│   └── vitest.setup.ts                        # Test setup
├── backend/
│   ├── src/__tests__/
│   │   ├── api-endpoints.test.ts              # API endpoint tests
│   │   ├── ast-parser.test.ts                 # AST parsing tests
│   │   ├── error-handling.test.ts             # Error handling tests
│   │   ├── data-structure.test.ts             # Data consistency tests
│   │   ├── app.test.ts                        # Application tests
│   │   ├── cache.test.ts                      # Cache service tests
│   │   ├── github.test.ts                     # GitHub integration tests
│   │   └── integration/
│   │       ├── analysis.test.ts               # Analysis flow tests
│   │       └── full-flow.test.ts              # Complete flow tests
│   ├── src/__mocks__/
│   │   └── uuid.js                            # UUID mock for testing
│   └── jest.config.js                         # Jest configuration
└── e2e-tests/
    ├── comprehensive-analysis.e2e.test.tsx    # End-to-end tests
    ├── upload-flow.e2e.test.tsx              # Upload flow E2E
    ├── analysis-display.e2e.test.tsx         # Display E2E
    ├── tabs-functionality.e2e.test.tsx       # Tab navigation E2E
    └── cross-browser.e2e.test.tsx            # Cross-browser tests
```

## Running Tests

### Frontend Tests (Vitest)

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run all tests including build
npm run test:all
```

### Backend Tests (Jest)

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests (Playwright)

```bash
# Install Playwright if not already installed
npx playwright install

# Run E2E tests
npx playwright test

# Run specific test file
npx playwright test comprehensive-analysis.e2e.test.tsx

# Run with UI mode
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## Test Categories

### 1. API Integration Tests

**Purpose**: Prevent 404 API errors and ensure proper communication between frontend and backend.

**Key Tests**:
- `/Users/usama/DevProjects/CodeVisualizer/frontend/__tests__/api/api-endpoints.test.ts`
- `/Users/usama/DevProjects/CodeVisualizer/backend/src/__tests__/api-endpoints.test.ts`

**What's Tested**:
- Correct API endpoint URLs
- Backend health checks
- Response format validation
- Error handling for missing endpoints
- Timeout handling

### 2. File Upload Functionality

**Purpose**: Ensure robust file upload with proper filtering and error handling.

**Key Tests**:
- `/Users/usama/DevProjects/CodeVisualizer/frontend/__tests__/components/FileUpload.enhanced.test.tsx`

**What's Tested**:
- JSON config file filtering (package.json, tsconfig.json, etc.)
- Single and folder upload scenarios
- File type validation
- Large file handling
- Binary file rejection
- Special character handling in filenames
- Event handling (preventDefault, stopPropagation)

### 3. Data Structure Consistency

**Purpose**: Prevent double-nested data structures and ensure consistent data flow.

**Key Tests**:
- `/Users/usama/DevProjects/CodeVisualizer/backend/src/__tests__/data-structure.test.ts`
- `/Users/usama/DevProjects/CodeVisualizer/frontend/__tests__/integration/frontend-backend.test.tsx`

**What's Tested**:
- AnalysisFile structure validation
- ParsedFile structure consistency
- Analysis result format (prevents double-nesting)
- Cross-service data consistency
- Type safety validation

### 4. AST Parsing

**Purpose**: Ensure robust parsing of various file types, especially TSX files.

**Key Tests**:
- `/Users/usama/DevProjects/CodeVisualizer/backend/src/__tests__/ast-parser.test.ts`

**What's Tested**:
- JavaScript/TypeScript parsing
- JSX/TSX syntax handling
- Python file parsing
- Syntax error handling
- Empty file handling
- Large file processing
- Complex nested structures
- Import/export detection
- Complexity calculation

### 5. Error Handling and Edge Cases

**Purpose**: Comprehensive error handling to prevent runtime crashes.

**Key Tests**:
- `/Users/usama/DevProjects/CodeVisualizer/backend/src/__tests__/error-handling.test.ts`

**What's Tested**:
- Malformed JSON handling
- Network timeout errors
- Cache service failures
- Memory pressure scenarios
- Concurrent request handling
- Input sanitization
- Resource cleanup

### 6. Event Handling

**Purpose**: Prevent double popups and form submission issues.

**What's Tested**:
- preventDefault and stopPropagation implementation
- Double-click prevention
- Form submission throttling
- Event propagation control

## Specific Bug Prevention

### 1. 404 API Errors

**Problem**: Frontend making requests to incorrect API endpoints.

**Solution**:
- Centralized API configuration in `/Users/usama/DevProjects/CodeVisualizer/frontend/lib/config.ts`
- Comprehensive endpoint testing
- Backend health check validation

**Tests**:
- API endpoint configuration tests
- Integration tests with actual HTTP calls

### 2. Double-Nested Data Structures

**Problem**: Backend returning `{ analysis: { analysis: { ... } } }` instead of `{ analysis: { ... } }`.

**Solution**:
- Strict TypeScript interfaces
- Data structure validation tests
- Response format testing

**Tests**:
- Data structure consistency tests
- Response format validation

### 3. TSX Parsing Errors

**Problem**: AST parser failing on complex TSX syntax.

**Solution**:
- Robust error handling in AST parser
- Fallback parsing strategies
- Comprehensive TSX test cases

**Tests**:
- TSX parsing with complex syntax
- Malformed TSX handling
- JSX syntax variations

### 4. Double Popup Issues

**Problem**: Multiple file dialogs or form submissions.

**Solution**:
- Proper event handling with preventDefault/stopPropagation
- Button state management
- Debouncing for rapid clicks

**Tests**:
- Event handling tests
- Rapid click prevention
- Form submission throttling

### 5. JSON Config File Filtering

**Problem**: Config files (package.json, tsconfig.json) being processed as code.

**Solution**:
- Explicit file filtering in upload component
- Backend validation
- File type checking

**Tests**:
- Mixed file type upload tests
- Config file exclusion validation

## Test Configuration

### Frontend (Vitest)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: [
      { find: '@/components', replacement: path.resolve(__dirname, './components') },
      { find: '@/lib', replacement: path.resolve(__dirname, './lib') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
```

### Backend (Jest)

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapping: {
    '^uuid$': '<rootDir>/src/__mocks__/uuid.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

## Test Data and Mocks

### UUID Mock

```javascript
// backend/src/__mocks__/uuid.js
module.exports = {
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v1: jest.fn(() => 'mocked-uuid-v1'),
  v3: jest.fn(() => 'mocked-uuid-v3'),
  v5: jest.fn(() => 'mocked-uuid-v5'),
};
```

### File Upload Mocks

```typescript
// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn((options) => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}));
```

## Coverage Requirements

- **Frontend**: Minimum 80% code coverage
- **Backend**: Minimum 85% code coverage
- **Critical paths**: 95% coverage for file upload and analysis flows

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:coverage

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npx playwright install
      - run: npm run build
      - run: npm start &
      - run: npx playwright test
```

## Debugging Tests

### Frontend Debug

```bash
# Debug specific test
npm test -- --reporter=verbose FileUpload.test.tsx

# Debug with browser
npm test -- --browser

# Debug integration tests
npm run test:integration -- --reporter=verbose
```

### Backend Debug

```bash
# Debug specific test
npm test -- --verbose ast-parser.test.ts

# Debug with inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug integration tests
npm test -- integration/
```

### E2E Debug

```bash
# Debug with headed browser
npx playwright test --headed

# Debug specific test
npx playwright test --debug comprehensive-analysis.e2e.test.tsx

# Generate trace
npx playwright test --trace on
```

## Performance Testing

### Load Testing

```bash
# Test with many files
npm test -- --testNamePattern="large numbers of files"

# Memory leak testing
npm test -- --detectOpenHandles --forceExit
```

### Benchmarking

```typescript
// Example performance test
it('should process 100 files in under 5 seconds', async () => {
  const startTime = performance.now();

  // ... test logic

  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(5000);
});
```

## Test Maintenance

### Regular Tasks

1. **Weekly**: Run full test suite with coverage
2. **Monthly**: Review and update test data
3. **Release**: Run E2E tests across all supported browsers
4. **Quarterly**: Performance baseline updates

### Adding New Tests

1. Identify the scenario to test
2. Choose appropriate test type (unit/integration/e2e)
3. Add test data and mocks as needed
4. Ensure proper cleanup
5. Update documentation

### Test Quality Guidelines

1. **Descriptive names**: Test names should clearly describe what's being tested
2. **Single responsibility**: Each test should focus on one specific behavior
3. **Isolation**: Tests should not depend on each other
4. **Repeatability**: Tests should produce consistent results
5. **Maintainability**: Tests should be easy to understand and modify

## Troubleshooting

### Common Issues

1. **Import errors**: Check path aliases in test configuration
2. **Mock issues**: Verify mock setup in beforeEach/afterEach
3. **Timeout errors**: Increase timeout for slow operations
4. **Coverage issues**: Check file exclusions in coverage config

### Getting Help

1. Check test logs for specific error messages
2. Run tests in verbose mode for detailed output
3. Use debugger or console.log for complex issues
4. Review similar test cases for patterns

This comprehensive test suite ensures the CodeVisualizer application is robust, reliable, and free from the runtime errors that were previously encountered.