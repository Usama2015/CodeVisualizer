# Phase 2: Code Analysis & Data Extraction

## Phase Overview
- **Duration**: 2 days (target)
- **Start Time**: November 18, 2024, 6:15 PM
- **Status**: 🔄 Starting
- **Learning Applied**: Enhanced testing, build verification, agent validation

## Objectives
1. Implement advanced code analysis engine
2. Create dependency mapping between files/modules
3. Build architecture pattern detection
4. Add code quality assessment
5. Generate comprehensive metrics

## Changes from Original Plan (Based on Phase 1 Learning)

### 1. Testing-First Approach ✅
**Original Plan**: Build features then test
**NEW Plan**:
- Write integration tests BEFORE implementation
- Create test cases that verify the feature works end-to-end
- Run build verification after EVERY major change

### 2. Agent Validation ✅
**Original Plan**: Trust agent output
**NEW Plan**:
- Run immediate smoke test after agent completes
- Verify imports and paths immediately
- Check that frontend and backend can communicate

### 3. Incremental Integration ✅
**Original Plan**: Build all features then integrate
**NEW Plan**:
- Build one analysis feature
- Integrate with frontend immediately
- Test full flow before moving to next feature

## Phase 2 Implementation Plan

### Step 1: Enhanced Code Parser (Backend)
**Agent**: code-reviewer + backend-architect
**Features**:
- Parse JavaScript/TypeScript with full AST
- Extract dependencies (imports/exports)
- Map function calls and class usage
- Identify architectural patterns

**Test First**:
```javascript
// Write this test BEFORE implementation
describe('Code Analysis', () => {
  it('should extract all imports from a file', async () => {
    const code = `import React from 'react'; import {useState} from 'react';`;
    const analysis = await analyzeCode(code);
    expect(analysis.imports).toHaveLength(2);
  });
});
```

### Step 2: Dependency Graph Builder
**Agent**: backend-architect
**Features**:
- Build file dependency tree
- Identify circular dependencies
- Calculate module coupling
- Generate import/export matrix

### Step 3: Architecture Detection
**Agent**: code-reviewer
**Features**:
- Detect MVC, MVVM, Microservices patterns
- Identify component hierarchies
- Find API endpoints and routes
- Map data flow patterns

### Step 4: Code Quality Metrics
**Agent**: code-reviewer
**Features**:
- Cyclomatic complexity
- Code duplication detection
- Dead code identification
- Test coverage estimation

### Step 5: Frontend Visualization Integration
**Agent**: frontend-developer + api-integrator
**Features**:
- Display analysis results
- Show dependency graphs
- Render code metrics
- Interactive exploration

## Testing Strategy (ENHANCED)

### Pre-Implementation Tests
```bash
# 1. Create test file for each feature FIRST
frontend/__tests__/features/analysis-display.test.tsx
backend/src/__tests__/analysis/dependency-graph.test.ts

# 2. Write failing tests that describe expected behavior
# 3. Implement until tests pass
```

### Continuous Verification
```bash
# After EVERY agent task:
npm run test:all        # Frontend
npm test               # Backend
npm run test:build     # Build verification

# New: API contract testing
npm run test:api       # Verify frontend-backend communication
```

### Integration Points Testing
- [ ] Upload file → Parse → Return analysis
- [ ] Analysis data → Frontend display
- [ ] Multiple file analysis → Dependency graph
- [ ] Real codebase testing (use our own project!)

## API Endpoints (Phase 2)

```typescript
// New endpoints to add
POST /api/analyze/deep
  - Deep analysis with AST parsing
  - Request: { fileIds: string[], options: AnalysisOptions }
  - Response: { analysis: DeepAnalysis, dependencies: DependencyGraph }

GET /api/analysis/:id/dependencies
  - Get dependency graph for analysis
  - Response: { nodes: FileNode[], edges: Dependency[] }

GET /api/analysis/:id/metrics
  - Get code quality metrics
  - Response: { complexity: number, duplication: number, issues: Issue[] }

POST /api/analyze/architecture
  - Detect architecture patterns
  - Request: { projectId: string }
  - Response: { patterns: Pattern[], confidence: number }
```

## Data Models (Phase 2)

```typescript
interface DeepAnalysis {
  id: string;
  files: AnalyzedFile[];
  dependencies: DependencyGraph;
  metrics: ProjectMetrics;
  patterns: ArchitecturePattern[];
}

interface AnalyzedFile {
  path: string;
  language: string;
  ast: ASTNode;
  imports: Import[];
  exports: Export[];
  functions: FunctionDefinition[];
  classes: ClassDefinition[];
  complexity: number;
  issues: CodeIssue[];
}

interface DependencyGraph {
  nodes: FileNode[];
  edges: DependencyEdge[];
  cycles: Cycle[];
  coupling: CouplingMetric;
}
```

## Success Criteria (WITH TESTS)

### Each feature must have:
1. ✅ Unit tests (minimum 80% coverage)
2. ✅ Integration tests (end-to-end flow)
3. ✅ Build verification passing
4. ✅ Manual testing completed
5. ✅ API contract tests passing
6. ✅ Frontend display working

### Phase 2 Complete When:
- [ ] Can analyze a real project (test with CodeVisualizer itself!)
- [ ] Dependency graph displays correctly
- [ ] Metrics are accurate (verify with known tools)
- [ ] All tests pass (unit + integration + build)
- [ ] No console errors
- [ ] Performance < 5 seconds for 100 files

## Risk Mitigation (Based on Phase 1)

### Risk 1: Import Path Issues
**Mitigation**:
- Test imports immediately after file creation
- Verify both frontend and backend can import
- Run build test after adding new files

### Risk 2: Agent Output Quality
**Mitigation**:
- Review agent output before accepting
- Run immediate smoke test
- Have fallback plan if agent fails

### Risk 3: Frontend-Backend Mismatch
**Mitigation**:
- Use shared types from the start
- Test API endpoints immediately
- Verify data contract with integration tests

## Development Workflow (IMPROVED)

```bash
# 1. Start with tests
cd backend && npm run test:watch

# 2. Use agent for implementation
# [Agent implements feature]

# 3. Immediate verification
npm test
npm run build
curl http://localhost:3001/api/[new-endpoint]

# 4. Frontend integration
cd ../frontend
npm run test:integration

# 5. Full system test
npm run test:all

# 6. Document any issues immediately
# Update ISSUES_AND_SOLUTIONS.md
```

## Tools & Libraries for Phase 2

### Backend Dependencies to Add:
```json
{
  "@typescript-eslint/parser": "^5.0.0",
  "@typescript-eslint/typescript-estree": "^5.0.0",
  "acorn": "^8.0.0",
  "acorn-walk": "^8.0.0",
  "dependency-cruiser": "^15.0.0",
  "jscpd": "^3.5.0",
  "complexity-report": "^2.0.0-alpha"
}
```

### Frontend Dependencies to Add:
```json
{
  "d3": "^7.0.0",
  "@types/d3": "^7.0.0",
  "react-force-graph": "^1.43.0",
  "recharts": "^2.5.0"
}
```

## Phase 2 Task Breakdown

### Task 1: Setup & Testing Framework (30 min)
- [ ] Install new dependencies
- [ ] Create test structure for analysis features
- [ ] Set up shared types for analysis data
- [ ] Create API contract tests

### Task 2: AST Parser Implementation (2 hours)
**Agent**: code-reviewer
- [ ] Implement TypeScript/JavaScript AST parsing
- [ ] Extract comprehensive code information
- [ ] Test with various code patterns
- [ ] Verify accuracy with known codebases

### Task 3: Dependency Analysis (2 hours)
**Agent**: backend-architect
- [ ] Build dependency extraction
- [ ] Create dependency graph
- [ ] Detect circular dependencies
- [ ] Test with complex projects

### Task 4: Code Quality Analysis (1.5 hours)
**Agent**: code-reviewer
- [ ] Implement complexity calculation
- [ ] Add duplication detection
- [ ] Create issue identification
- [ ] Benchmark against existing tools

### Task 5: Frontend Display (2 hours)
**Agent**: frontend-developer
- [ ] Create analysis results page
- [ ] Build dependency graph visualization
- [ ] Add metrics dashboard
- [ ] Implement interactive features

### Task 6: Integration Testing (1 hour)
**Agent**: test-engineer
- [ ] Test complete flow
- [ ] Verify with real projects
- [ ] Performance testing
- [ ] Fix any issues

## Next Steps

1. **Immediate Action**: Install Phase 2 dependencies
2. **First Test**: Write test for AST parsing
3. **First Feature**: Implement basic AST parser
4. **Verify**: Test with CodeVisualizer's own code

## Key Differences from Phase 1

| Aspect | Phase 1 Approach | Phase 2 Approach |
|--------|------------------|------------------|
| Testing | After implementation | Before implementation |
| Integration | At end | Continuous |
| Validation | Trust agent | Verify immediately |
| Documentation | After issues | Proactive |
| Build checks | Forgotten | After every change |

## Questions Before Starting

1. Should we analyze our own CodeVisualizer project as the test case?
2. Which visualization library do you prefer (D3.js, React Force Graph, or other)?
3. Should we prioritize any specific analysis feature?
4. Do you want real-time analysis as files are uploaded?

---

**Ready to begin Phase 2 with improved practices!**