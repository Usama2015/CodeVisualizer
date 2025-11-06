# CodeVisualizer - Issues and Solutions

## Overview
This document tracks all issues encountered during development and their solutions for future reference and learning.

---

## Issue Log

### Issue #1
Date: November 18, 2024
Phase: Phase 1
Severity: High

**Problem**:
Frontend build error - Module not found: Can't resolve '@/components/upload/FileUpload'

**Error Message/Symptoms**:
```
Module not found: Can't resolve '@/components/upload/FileUpload'
> 1 | import FileUpload from '@/components/upload/FileUpload';
```

**Root Cause**:
The tsconfig.json path mapping was incorrect. The `@/*` alias pointed only to `./src/*` but the components folder was at the root level, not inside src.

**Attempted Solutions**:
1. Checked file structure to locate components folder
2. Verified the import path in page.tsx

**Final Solution**:
Updated tsconfig.json to add a specific path mapping for components:
```json
"paths": {
  "@/*": ["./src/*"],
  "@/components/*": ["./components/*"]
}
```

**Code Changes**:
```json
// Before (tsconfig.json)
"paths": {
  "@/*": ["./src/*"]
}

// After (tsconfig.json)
"paths": {
  "@/*": ["./src/*"],
  "@/components/*": ["./components/*"]
}
```

**Time to Resolve**: 2 minutes

**Prevention**:
- Always verify path mappings match actual folder structure
- Consider moving components folder inside src for consistency

**Lessons Learned**:
- Next.js path aliases must match actual directory structure
- rapid-prototyper agent created components at root level, not in src
- Quick fix is to update tsconfig, better fix would be consistent structure

**Why Testing Didn't Catch This**:
- Original tests only tested components in isolation (FileUpload.test.tsx)
- No integration tests for page imports
- No build verification in test suite
- Tests passed because they imported components directly, not through pages

**Testing Improvements Made**:
1. Added integration test suite (__tests__/integration/page.test.tsx)
2. Added build verification test (test:build script)
3. Added test:all script that runs build before tests
4. Now tests verify:
   - Import paths resolve correctly
   - tsconfig.json has proper mappings
   - Components exist in expected locations
   - Page can render with all imports

**New Testing Commands**:
```bash
npm run test:build       # Verify build succeeds
npm run test:integration # Run integration tests only
npm run test:all        # Build + all tests
```

---

### Template:
```
Issue #[NUMBER]
Date: [DATE]
Phase: [PHASE NUMBER]
Severity: [Critical/High/Medium/Low]

**Problem**:
[Detailed description of the issue]

**Error Message/Symptoms**:
```
[Error messages or symptoms]
```

**Root Cause**:
[What caused this issue]

**Attempted Solutions**:
1. [First attempt - didn't work]
2. [Second attempt - partial success]
3. [Final solution - worked]

**Final Solution**:
[Detailed solution that worked]

**Code Changes**:
```[language]
// Before
[old code]

// After
[new code]
```

**Time to Resolve**: [X minutes/hours]

**Prevention**:
[How to prevent this in future]

**Lessons Learned**:
[Key takeaways]
```

---

## Common Issues Reference

### Category: Setup Issues
- [Issues related to project setup will be listed here]

### Category: Frontend Issues
- [Frontend-specific issues will be listed here]

### Category: Backend Issues
- [Backend-specific issues will be listed here]

### Category: Integration Issues
- [Integration problems will be listed here]

### Category: Testing Issues
- [Testing-related issues will be listed here]

### Category: Performance Issues
- [Performance problems will be listed here]

### Category: Deployment Issues
- [Deployment issues will be listed here]

---

## Quick Solutions Reference

### Problem: [Common Issue]
**Quick Fix**: [Solution command or code]

---

## Debugging Strategies That Worked

1. [Strategy 1]
2. [Strategy 2]
3. [Strategy 3]

---

## Tools That Helped

### Debugging Tools:
- [Tool 1]: [How it helped]
- [Tool 2]: [How it helped]

### Testing Tools:
- [Tool 1]: [How it helped]
- [Tool 2]: [How it helped]

---

## Issue Statistics

| Phase | Issues Encountered | Avg Resolution Time | Critical Issues |
|-------|-------------------|--------------------:|-----------------|
| 1     | 1                 | 2 min              | 0               |
| 2     | 2                 | 15 min             | 2               |
| 3     | -                 | -                  | -               |
| 4     | -                 | -                  | -               |
| 5     | -                 | -                  | -               |
| 6     | -                 | -                  | -               |

---

## Notes
- Always document issues immediately when encountered
- Include screenshots where relevant
- Tag issues with phase number for easy reference
- Update prevention strategies based on patterns
## Issue 2: Frontend-Backend API Communication Error

**Date**: November 18, 2024
**Severity**: CRITICAL
**Status**: FIXED

**Error Message/Symptoms**:
```
Error: Failed to fetch analysis: Not Found
Try Again
```
Frontend showing 404 errors when trying to fetch analysis results after upload.

**Root Cause**:
Frontend components were making API calls to `/api/analysis/...` which were being handled by Next.js routing instead of the backend server on port 3001. The components were missing the full backend URL.

**Attempted Solutions**:
1. Fixed backend `/api/analysis/:id` endpoint to return actual data instead of mock - didn't solve the issue
2. Created integration tests - helped identify the problem
3. Updated all component fetch calls to use full backend URL - WORKED

**Final Solution**:
1. Updated all frontend component API calls to use `http://localhost:3001` prefix
2. Created a centralized configuration file for API endpoints
3. Added comprehensive integration tests to catch this issue

**Code Changes**:
```typescript
// Before - in components
const response = await fetch(`/api/analysis/${analysisId}`);

// After - with proper backend URL
const response = await fetch(`http://localhost:3001/api/analysis/${analysisId}`);

// Even better - using config
import { API_ENDPOINTS } from '@/lib/config';
const response = await fetch(API_ENDPOINTS.getAnalysis(analysisId));
```

**Testing Added**:
- Full flow integration test in `backend/src/__tests__/integration/full-flow.test.ts`
- Tests complete user journey from upload to visualization
- Verifies all API endpoints return correct data format

**Prevention**:
- Always use full backend URL for API calls from frontend
- Use centralized config for API endpoints
- Run integration tests before marking features complete
- Test the actual user flow, not just individual components
