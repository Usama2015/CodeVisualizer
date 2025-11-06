# CodeVisualizer Testing Checklist

## ⚠️ MANDATORY: Run Before Marking ANY Phase Complete

This checklist MUST be executed before considering any phase complete. Failure to run these tests may result in issues being discovered later by users.

---

## Phase Completion Testing Protocol

### 1. Unit Tests ✅
```bash
cd frontend && npm test
cd ../backend && npm test
```
**Pass Criteria**: All unit tests must pass

### 2. Integration Tests ✅
```bash
cd frontend && npm run test:integration
cd ../backend && npm run test:integration  # (when created)
```
**Pass Criteria**: All integration tests must pass

### 3. Build Verification ✅ (CRITICAL - Added after Issue #1)
```bash
cd frontend && npm run build
cd ../backend && npm run build
```
**Pass Criteria**: Build must complete without errors

### 4. Development Server Test ✅
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Then verify:
curl http://localhost:3001/health  # Backend health
curl http://localhost:3000          # Frontend loads
```
**Pass Criteria**: Both servers start without errors

### 5. Manual Smoke Test ✅
1. Open http://localhost:3000 in browser
2. Try uploading a file
3. Try entering a GitHub URL
4. Check browser console for errors
5. Check network tab for failed requests

**Pass Criteria**: No errors in console or network

### 6. Cross-Platform Path Test ✅
```bash
# Verify imports work
grep -r "@/components" frontend/src
grep -r "import.*from" frontend/src

# Check tsconfig paths match actual directories
ls frontend/components
ls frontend/src/components
cat frontend/tsconfig.json | grep paths -A 5
```
**Pass Criteria**: All import paths resolve correctly

---

## Testing Commands Reference

### Quick Test All
```bash
# Run this before EVERY commit
npm run test:all
```

### Frontend Testing
```bash
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run test:build      # Build verification
npm run test:all        # Everything
```

### Backend Testing
```bash
npm test                 # Unit tests
npm run test:integration # Integration tests (when added)
npm run build           # Build verification
```

---

## Common Issues to Test For

### Issue #1: Import Path Resolution ✅
**Test**: Run integration tests
**Verify**: All imports resolve correctly
**Command**: `npm run test:integration`

### Issue #2: Configuration Mismatches
**Test**: Check all config files align
**Verify**: tsconfig, vitest.config, next.config all use same paths
**Command**: `npm run test:build`

### Issue #3: Missing Dependencies
**Test**: Fresh install test
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

---

## When to Run Full Checklist

1. ✅ **Before marking any phase complete**
2. ✅ **After any major code changes**
3. ✅ **Before pushing to repository**
4. ✅ **After fixing any issue**
5. ✅ **When switching between phases**

---

## Testing Gaps Found & Fixed

### Gap 1: No Build Verification (Fixed)
- **Found**: Phase 1 tests passed but build failed
- **Fix**: Added test:build script and integration tests
- **Prevention**: Always run npm run test:all

### Gap 2: Path Resolution Testing (Fixed)
- **Found**: Component imports worked in tests but not in app
- **Fix**: Added integration tests for page imports
- **Prevention**: Test actual page rendering, not just components

### Gap 3: Config Synchronization (Fixed)
- **Found**: tsconfig and vitest.config had different paths
- **Fix**: Synchronized all config files
- **Prevention**: Integration tests now verify configs match

---

## Test Coverage Goals

| Test Type | Current | Target | Status |
|-----------|---------|--------|--------|
| Unit Tests | 11 | 20+ | 🟡 |
| Integration Tests | 5 | 10+ | 🟡 |
| E2E Tests | 0 | 5+ | 🔴 |
| Build Tests | 1 | 1 | ✅ |

---

## Continuous Improvement

After each issue:
1. Add a test that would have caught it
2. Update this checklist
3. Run the new test in CI/CD
4. Document in ISSUES_AND_SOLUTIONS.md

---

**Remember**: A test that wasn't run is a test that doesn't exist. Always run ALL tests before declaring success!