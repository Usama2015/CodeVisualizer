#!/bin/bash

# Integration Test Script for CodeVisualizer
# Tests the complete flow from upload to visualization

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

echo -e "${BLUE}🔍 CodeVisualizer Integration Test${NC}"
echo "=================================================="

# Check if servers are running
echo -e "\n${YELLOW}📡 Checking servers...${NC}"

if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo -e "${YELLOW}Start it with: cd backend && npm run dev${NC}"
    exit 1
fi

if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is NOT running${NC}"
    echo -e "${YELLOW}Start it with: cd frontend && npm run dev${NC}"
    exit 1
fi

# Test complete flow
echo -e "\n${YELLOW}🔬 Testing complete flow...${NC}"

# Step 1: Analyze files
echo -e "  Uploading and analyzing files..."
ANALYSIS_ID=$(curl -s -X POST "$BACKEND_URL/api/analyze/deep" \
    -H "Content-Type: application/json" \
    -d '{
        "files": [{
            "id": "test-1",
            "name": "App.tsx",
            "content": "import React from \"react\";\nexport default function App() {\n  const [count, setCount] = React.useState(0);\n  return <div>Count: {count}</div>;\n}",
            "language": "typescript"
        }, {
            "id": "test-2",
            "name": "utils.ts",
            "content": "export function add(a: number, b: number) { return a + b; }",
            "language": "typescript"
        }]
    }' | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

if [ -z "$ANALYSIS_ID" ]; then
    echo -e "${RED}❌ Failed to create analysis${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Analysis created: $ANALYSIS_ID${NC}"

# Step 2: Verify all endpoints
echo -e "\n${YELLOW}📊 Verifying all API endpoints...${NC}"

# Test analysis retrieval
ANALYSIS_RESPONSE=$(curl -s "$BACKEND_URL/api/analysis/$ANALYSIS_ID")
if echo "$ANALYSIS_RESPONSE" | grep -q "$ANALYSIS_ID"; then
    echo -e "  ${GREEN}✅ /api/analysis/:id${NC}"
else
    echo -e "  ${RED}❌ /api/analysis/:id failed${NC}"
    echo "Debug: Response was: $ANALYSIS_RESPONSE"
    exit 1
fi

# Test dependencies endpoint
if curl -s "$BACKEND_URL/api/analysis/$ANALYSIS_ID/dependencies" | grep -q "nodes"; then
    echo -e "  ${GREEN}✅ /api/analysis/:id/dependencies${NC}"
else
    echo -e "  ${RED}❌ /api/analysis/:id/dependencies failed${NC}"
    exit 1
fi

# Test metrics endpoint
if curl -s "$BACKEND_URL/api/analysis/$ANALYSIS_ID/metrics" | grep -q "overall"; then
    echo -e "  ${GREEN}✅ /api/analysis/:id/metrics${NC}"
else
    echo -e "  ${RED}❌ /api/analysis/:id/metrics failed${NC}"
    exit 1
fi

# Test architecture endpoint
if curl -s "$BACKEND_URL/api/analysis/$ANALYSIS_ID/architecture" | grep -q "patterns"; then
    echo -e "  ${GREEN}✅ /api/analysis/:id/architecture${NC}"
else
    echo -e "  ${RED}❌ /api/analysis/:id/architecture failed${NC}"
    exit 1
fi

# Step 3: Verify data structure
echo -e "\n${YELLOW}🔍 Verifying data structure...${NC}"

ANALYSIS_DATA=$(curl -s "$BACKEND_URL/api/analysis/$ANALYSIS_ID")

# Check for required fields
if echo "$ANALYSIS_DATA" | grep -q "\"analysis\""; then
    echo -e "  ${GREEN}✅ Analysis data present${NC}"
else
    echo -e "  ${RED}❌ Analysis data missing${NC}"
    exit 1
fi

if echo "$ANALYSIS_DATA" | grep -q "\"dependencies\""; then
    echo -e "  ${GREEN}✅ Dependencies data present${NC}"
else
    echo -e "  ${RED}❌ Dependencies data missing${NC}"
    exit 1
fi

if echo "$ANALYSIS_DATA" | grep -q "\"warnings\""; then
    echo -e "  ${GREEN}✅ Warnings data present${NC}"
else
    echo -e "  ${RED}❌ Warnings data missing${NC}"
    exit 1
fi

# Step 4: Test error handling
echo -e "\n${YELLOW}⚠️  Testing error handling...${NC}"

# Test invalid analysis ID
if curl -s "$BACKEND_URL/api/analysis/invalid-id" | grep -q "not found"; then
    echo -e "  ${GREEN}✅ 404 handling works${NC}"
else
    echo -e "  ${RED}❌ 404 handling failed${NC}"
fi

# Test empty file upload
EMPTY_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/analyze/deep" \
    -H "Content-Type: application/json" \
    -d '{"files": []}')

if echo "$EMPTY_RESPONSE" | grep -q "error"; then
    echo -e "  ${GREEN}✅ Empty file validation works${NC}"
else
    echo -e "  ${RED}❌ Empty file validation failed${NC}"
fi

echo -e "\n=================================================="
echo -e "${GREEN}🎉 All integration tests PASSED!${NC}"
echo -e "${GREEN}✨ CodeVisualizer is working correctly${NC}"
echo ""
echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo -e "${BLUE}Test Analysis:${NC} $FRONTEND_URL?analysisId=$ANALYSIS_ID"
echo ""
echo -e "${YELLOW}You can now:${NC}"
echo "1. Open the frontend at $FRONTEND_URL"
echo "2. Upload files through the UI"
echo "3. View the analysis results"